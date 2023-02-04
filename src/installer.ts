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
import fs from 'fs'
import os from 'os'
import {StableReleaseAlias} from './constants'

type InstallationType = 'dist' | 'manifest'

export interface ISpecmaticVersionFile {
  filename: string
  os: string
  arch: string
  platform: string
}

export interface ISpecmaticVersion {
  version: string
  stable: boolean
  files: ISpecmaticVersionFile[]
}

export interface ISpecmaticVersionInfo {
  type: InstallationType
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
  auth: string | undefined,
  arch = os.arch()
): Promise<string> {
  const osPlat: string = os.platform()
  let manifest: tc.IToolRelease[] | undefined

  if (
    versionSpec === StableReleaseAlias.Stable ||
    versionSpec === StableReleaseAlias.OldStable
  ) {
    manifest = await getManifest(auth)
    let stableVersion = await resolveStableVersionInput(
      versionSpec,
      arch,
      osPlat,
      manifest
    )

    if (!stableVersion) {
      stableVersion = await resolveStableVersionDist(versionSpec, arch, osPlat)
      if (!stableVersion) {
        throw new Error(
          `Unable to find Specmatic version '${versionSpec}' for platform ${osPlat} and architecture ${arch}.`
        )
      }
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
      arch,
      manifest
    )

    if (resolvedVersion) {
      versionSpec = resolvedVersion
      core.info(`Resolved as '${versionSpec}'`)
    } else {
      core.info(`Failed to resolve version ${versionSpec} from manifest`)
    }
  }

  // check cache
  const toolPath = tc.find('specmatic', versionSpec, arch)

  // If not found in cache, download
  if (toolPath) {
    core.info(`Found in cache: ${toolPath}`)
    return toolPath
  }

  core.info(`Attempting to download ${versionSpec}...`)
  let downloadPath = ''
  let info: ISpecmaticVersionInfo | null = null

  //
  // Try download using manifest file
  //
  try {
    info = await getInfoFromManifest(versionSpec, true, auth, arch, manifest)
    if (info) {
      downloadPath = await installSpecmaticVersion(info, auth, arch)
    } else {
      core.info(
        'Not found in manifest.  Falling back to download directly from Specmatic'
      )
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
    core.info('Falling back to download directly from Specmatic')
  }

  //
  // Download from Specmatic releases
  //
  if (!downloadPath) {
    info = await getInfoFromDist(versionSpec, arch)
    if (!info) {
      throw new Error(
        `Unable to find Specmatic version '${versionSpec}' for platform ${osPlat} and architecture ${arch}.`
      )
    }

    try {
      core.info('Install from dist')
      downloadPath = await installSpecmaticVersion(info, auth, arch)
    } catch (err) {
      throw new Error(`Failed to download version ${versionSpec}: ${err}`)
    }
  }

  return downloadPath
}

async function resolveVersionFromManifest(
  versionSpec: string,
  stable: boolean,
  auth: string | undefined,
  arch: string,
  manifest: tc.IToolRelease[] | undefined
): Promise<string | undefined> {
  try {
    const info = await getInfoFromManifest(
      versionSpec,
      stable,
      auth,
      arch,
      manifest
    )
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
  auth: string | undefined,
  arch: string
): Promise<string> {
  core.info(`Acquiring ${info.resolvedVersion} from ${info.downloadUrl}...`)

  const downloadPath = await tc.downloadTool(info.downloadUrl)
  core.info(`Successfully download specmatic to ${downloadPath}`)

  core.info(`Adding to the cache...`)
  info.installPath = await tc.cacheFile(
    downloadPath,
    info.fileName,
    info.name,
    info.resolvedVersion,
    arch
  )
  core.info(`Successfully cached specmatic to ${info.installPath}`)

  await writeJarScript(info)

  return info.installPath
}

export async function getInfoFromManifest(
  versionSpec: string,
  stable: boolean,
  auth: string | undefined,
  arch = os.arch(),
  manifest?: tc.IToolRelease[] | undefined
): Promise<ISpecmaticVersionInfo | null> {
  let info: ISpecmaticVersionInfo | null = null
  if (!manifest) {
    core.debug('No manifest cached')
    manifest = await getManifest(auth)
  }
  core.debug(`matching ${versionSpec}...`)
  const rel = await tc.findFromManifest(versionSpec, stable, manifest, arch)

  if (rel && rel.files.length > 0) {
    info = {} as ISpecmaticVersionInfo
    info.type = 'manifest'
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
  core.debug('Download manifest from @airslate-oss/setup-specmatic')
  const manifest = tc.getManifestFromRepo(
    'airslate-oss',
    'setup-specmatic',
    auth,
    'main'
  )

  return manifest
}

async function writeJarScript(tool: ISpecmaticVersionInfo): Promise<void> {
  core.info('Creating executable...')

  let header = ''
  let wrapper = ''
  let filename = tool.name
  const cmd = `java -jar "${path.join(tool.installPath, tool.fileName)}"`

  if (os.platform() === 'win32') {
    wrapper = `start ${cmd} %*`
    filename = `${tool.name}.bat`
  } else {
    header = '#!/usr/bin/env bash'
    wrapper = `exec -a ${tool.name} ${cmd} "$@"\n`
  }

  const script = `${header}${os.EOL}${wrapper}${os.EOL}`
  const scriptPath = path.join(tool.installPath, filename)

  await fs.promises.writeFile(scriptPath, script, {mode: 0o555})

  core.info(`Successfully created executable at ${scriptPath}`)
}

async function getInfoFromDist(
  versionSpec: string,
  arch: string
): Promise<ISpecmaticVersionInfo | null> {
  const version: ISpecmaticVersion | undefined = await findMatch(
    versionSpec,
    arch
  )
  if (!version) {
    core.debug(`${versionSpec} did'n match`)
    return null
  }

  const downloadUrl = `https://github.com/znsio/specmatic/releases/download/${version.version}/specmatic.jar`

  return {
    type: 'dist',
    downloadUrl,
    resolvedVersion: versionSpec,
    fileName: 'specmatic.jar',
    installPath: '',
    name: 'specmatic'
  } as ISpecmaticVersionInfo
}

export async function findMatch(
  versionSpec: string,
  arch = os.arch()
): Promise<ISpecmaticVersion | undefined> {
  let result: ISpecmaticVersion | undefined
  let match: ISpecmaticVersion | undefined

  const dlUrl = 'https://api.github.com/repos/znsio/specmatic/releases'

  const releases: GithubRelease[] | null = await getVersionsDist(dlUrl)
  if (!releases) {
    throw new Error(`Specmatic releases url did not return results`)
  }

  const candidates: ISpecmaticVersion[] = releasesToSpecmaticVersions(releases)
  let specmaticFile: ISpecmaticVersionFile | undefined

  for (const candidate of candidates) {
    core.debug(`check ${candidate.version} satisfies ${versionSpec}`)
    if (semver.satisfies(candidate.version, versionSpec)) {
      specmaticFile = candidate.files.find(file => {
        core.debug(`${file.arch}===${arch} && ${file.os}===${os.platform()}`)
        return file.arch === arch && file.os === os.platform()
      })

      if (specmaticFile) {
        core.debug(`matched ${candidate.version}`)
        match = candidate
        break
      }
    }
  }

  if (match && specmaticFile) {
    // clone since we're mutating the file list to be only the file that matches
    result = Object.assign({}, match)
    result.files = [specmaticFile]
  }

  return result
}

export async function getVersionsDist(
  dlUrl: string
): Promise<GithubRelease[] | null> {
  // this returns versions descending so latest is first
  const http: httpm.HttpClient = new httpm.HttpClient('setup-specmatic', [], {
    allowRedirects: true,
    maxRedirects: 3
  })
  return (await http.getJson<GithubRelease[]>(dlUrl)).result
}

function releasesToSpecmaticVersions(
  releases: GithubRelease[]
): ISpecmaticVersion[] {
  const manifest: ISpecmaticVersion[] = []
  const files: ISpecmaticVersionFile[] = []

  for (const platform of ['darwin', 'linux', 'win32']) {
    files.push({
      filename: 'specmatic.jar',
      os: platform,
      arch: 'x64',
      platform
    } as ISpecmaticVersionFile)
  }

  for (const release of releases) {
    manifest.push({
      version: release.tag_name,
      stable: true,
      files
    } as unknown as ISpecmaticVersion)
  }

  return manifest
}

export function parseSpecmaticVersionFile(versionFilePath: string): string {
  const contents = fs.readFileSync(versionFilePath).toString()
  const match = contents.match(/^(\d+(\.\d+)*)/m)
  return (match ? match[1] : '').trim()
}

async function resolveStableVersionDist(
  versionSpec: string,
  arch: string,
  platform: string
): Promise<string | undefined> {
  const dlUrl = 'https://api.github.com/repos/znsio/specmatic/releases'

  const releases: GithubRelease[] | null = await getVersionsDist(dlUrl)
  if (!releases) {
    throw new Error(`Specmatic releases url did not return results`)
  }

  const candidates: ISpecmaticVersion[] = releasesToSpecmaticVersions(releases)
  const stableVersion = await resolveStableVersionInput(
    versionSpec,
    arch,
    platform,
    candidates
  )

  return stableVersion
}

export async function resolveStableVersionInput(
  versionSpec: string,
  arch: string,
  platform: string,
  manifest: tc.IToolRelease[] | ISpecmaticVersion[]
): Promise<string | undefined> {
  const releases = manifest
    .map(item => {
      const index = item.files.findIndex(
        i => i.arch === arch && i.platform === platform
      )
      return index === -1 ? '' : item.version
    })
    .filter(item => !!item && !semver.prerelease(item))

  core.debug(`resolved releases: ${JSON.stringify(releases)}`)
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
