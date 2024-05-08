// This file is part of the setup-specmatic.
//
// Copyright (c) 2023 airSlate, Inc.
//
// For the full copyright and license information, please view
// the LICENSE file that was distributed with this source code.

import * as tc from '@actions/tool-cache'
import * as core from '@actions/core'
import * as path from 'path'
import * as semver from 'semver'
import * as httpm from '@actions/http-client'
import {OutgoingHttpHeaders} from 'http'
import fs from 'fs'
import os from 'os'

export enum StableReleaseAlias {
  Stable = 'stable',
  OldStable = 'oldstable'
}

export interface ISpecmaticVersionInfo {
  downloadUrl: string
  resolvedVersion: string
  fileName: string
  installPath: string
  name: string
}

export type GithubRelease = {
  tag_name: string
  html_url: string
  assets: GithubReleaseAsset[]
}

export interface GithubReleaseAsset {
  name: string
  browser_download_url: string
}

export async function getSpecmatic(
  versionSpec: string,
  checkLatest: boolean,
  auth: string | undefined
): Promise<string> {
  let manifest: tc.IToolRelease[] | undefined

  if (
    versionSpec === StableReleaseAlias.Stable ||
    versionSpec === StableReleaseAlias.OldStable
  ) {
    manifest = await getManifest(auth)
    const stableVersion = await resolveStableVersionInput(versionSpec, manifest)
    if (!stableVersion) {
      throw new Error(`Unable to find Specmatic version '${versionSpec}'.`)
    }

    core.info(`${versionSpec} version resolved as ${stableVersion}`)
    versionSpec = stableVersion
  }

  if (checkLatest) {
    core.info('Attempting to resolve the latest version from the manifest...')
    const resolvedVersion = await resolveVersionFromManifest(
      versionSpec,
      true,
      auth,
      manifest
    )

    if (resolvedVersion) {
      versionSpec = resolvedVersion
      core.info(`Resolved as '${versionSpec}'`)
    }
  }

  // check cache
  const toolPath = tc.find('specmatic', versionSpec)

  // If not found in cache, download
  if (toolPath) {
    core.info(`Found in cache: ${toolPath}`)
    return toolPath
  }

  core.info(`Attempting to download ${versionSpec}...`)
  let info: ISpecmaticVersionInfo | null = null

  //
  // Try download using manifest file
  //
  try {
    info = await getInfoFromManifest(versionSpec, true, auth, manifest)
    if (info) {
      return await installSpecmaticVersion(info, auth)
    } else {
      throw new Error(`Unable to find Specmatic version '${versionSpec}'.`)
    }
  } catch (err) {
    if (
      err instanceof tc.HTTPError &&
      (err.httpStatusCode === 403 || err.httpStatusCode === 429)
    ) {
      core.info(
        `Received HTTP status code ${err.httpStatusCode}.  This usually indicates the rate limit has been exceeded`
      )
    } else {
      core.info((err as Error).message)
    }
    core.debug((err as Error).stack ?? '')
    throw err
  }
}

async function resolveVersionFromManifest(
  versionSpec: string,
  stable: boolean,
  auth: string | undefined,
  manifest?: tc.IToolRelease[] | undefined
): Promise<string | undefined> {
  try {
    const info = await getInfoFromManifest(versionSpec, stable, auth, manifest)
    return info?.resolvedVersion
  } catch (err) {
    core.info('Unable to resolve a version from the manifest...')
    if (err instanceof Error) {
      core.debug(err.message)
    }
  }
}

async function installSpecmaticVersion(
  info: ISpecmaticVersionInfo,
  auth: string | undefined
): Promise<string> {
  core.info(`Acquiring ${info.resolvedVersion} from ${info.downloadUrl}...`)

  const downloadPath = await tc.downloadTool(info.downloadUrl, undefined, auth)
  core.info(`Successfully download specmatic to ${downloadPath}`)

  core.info(`Adding to the cache...`)
  info.installPath = await tc.cacheFile(
    downloadPath,
    info.fileName,
    info.name,
    makeSemver(info.resolvedVersion)
  )
  core.info(`Successfully cached specmatic to ${info.installPath}`)

  await writeJarScript(info)

  return info.installPath
}

export async function getInfoFromManifest(
  versionSpec: string,
  stable: boolean,
  auth: string | undefined,
  manifest?: tc.IToolRelease[] | undefined
): Promise<ISpecmaticVersionInfo | null> {
  let info: ISpecmaticVersionInfo | null = null
  if (!manifest) {
    core.debug('No manifest cached')
    manifest = await getManifest(auth)
  }
  core.debug(`matching ${versionSpec}...`)
  const rel = await tc.findFromManifest(versionSpec, stable, manifest)

  if (rel && rel.files.length > 0) {
    info = {} as ISpecmaticVersionInfo
    info.resolvedVersion = rel.version
    info.downloadUrl = rel.files[0].download_url
    info.fileName = rel.files[0].filename
    info.installPath = ''
    info.name = 'specmatic'
  }

  return info
}

export async function getManifest(
  auth: string | undefined
): Promise<tc.IToolRelease[]> {
  const dlUrl = 'https://api.github.com/repos/znsio/specmatic/releases'
  const releases: GithubRelease[] | null =
    // eslint-disable-next-line import/no-commonjs
    await module.exports.getGithubReleases(dlUrl, auth)

  if (!releases) {
    throw new Error('Specmatic releases url did not return results')
  }

  core.debug('Create version manifest from releases info')
  const manifest: tc.IToolRelease[] = releasesToToolRelease(releases)

  return manifest
}

async function writeJarScript(tool: ISpecmaticVersionInfo): Promise<void> {
  core.info('Creating wrapper...')

  let header = ''
  let wrapper = ''
  let filename = tool.name
  const cmd = `java -jar "${path.join(tool.installPath, tool.fileName)}"`

  if (os.platform() === 'win32') {
    wrapper = `${cmd} %*`
    filename = `${tool.name}.bat`
  } else {
    header = `#!/usr/bin/env bash${os.EOL}`
    wrapper = `exec -a ${tool.name} ${cmd} "$@"`
  }

  const script = `${header}${wrapper}${os.EOL}`
  const scriptPath = path.join(tool.installPath, filename)

  await fs.promises.writeFile(scriptPath, script, {mode: 0o555})

  core.info(`Successfully created wrapper at ${scriptPath}`)
}

export async function getGithubReleases(
  dlUrl: string,
  auth?: string
): Promise<GithubRelease[] | null> {
  const http: httpm.HttpClient = new httpm.HttpClient('setup-specmatic', [], {
    allowRedirects: true,
    maxRedirects: 3
  })

  const headers: OutgoingHttpHeaders = {}
  if (auth) {
    core.debug('set auth')
    headers.authorization = auth
  }

  // this returns versions descending so latest is first
  return (await http.getJson<GithubRelease[]>(dlUrl, headers)).result
}

// Convert the specmatic version syntax into semver for semver matching
// 0.58.0 => 0.58.0
// 0.59 => 0.59
// 0.60.0-beta.1 => 0.60.0-beta.1
export function makeSemver(version: string): string {
  const parts = version.split('-')
  const semVersion = semver.coerce(parts[0])?.version
  if (!semVersion) {
    throw new Error(
      `The version: ${version} can't be changed to SemVer notation`
    )
  }

  if (!parts[1]) {
    return semVersion
  }

  const fullVersion = semver.valid(`${semVersion}-${parts[1]}`)
  if (!fullVersion) {
    throw new Error(
      `The version: ${version} can't be changed to SemVer notation`
    )
  }

  return fullVersion
}

function releasesToToolRelease(releases: GithubRelease[]): tc.IToolRelease[] {
  const manifest: tc.IToolRelease[] = []

  for (const release of releases) {
    const files: tc.IToolReleaseFile[] = []
    for (const platform of ['darwin', 'linux', 'win32']) {
      files.push({
        filename: 'specmatic.jar',
        platform,
        arch: os.arch(),
        download_url: release.assets[0].browser_download_url
      })
    }

    manifest.push({
      version: release.tag_name,
      stable: true,
      files
    } as tc.IToolRelease)
  }

  return manifest
}

export function parseSpecmaticVersionFile(versionFilePath: string): string {
  const contents = fs.readFileSync(versionFilePath).toString()
  const match = contents.match(/^(\d+(\.\d+)*)/m)
  return (match ? match[1] : '').trim()
}

export async function resolveStableVersionInput(
  versionSpec: string,
  manifest: tc.IToolRelease[]
): Promise<string | undefined> {
  const releases = manifest
    .map(item => {
      const index = item.files.findIndex(i => i.platform === os.platform())
      return index === -1 ? '' : item.version
    })
    .filter(item => !!item && !semver.prerelease(item))

  if (versionSpec === StableReleaseAlias.Stable) {
    return releases[0]
  } else {
    const versions = releases.map(
      release => `${semver.major(release)}.${semver.minor(release)}`
    )
    const uniqueVersions = Array.from(new Set(versions))

    const oldStableVersion = releases.find(item =>
      item.startsWith(uniqueVersions[1])
    )

    return oldStableVersion
  }
}
