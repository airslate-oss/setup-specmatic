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
import fs from 'fs'
import os from 'os'
import {StableReleaseAlias} from './utils'

type InstallationType = 'dist' | 'manifest'

export interface ISpecmaticVersionFile {
  filename: string
  os: string
  arch: string
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
    const stableVersion = await resolveStableVersionInput(
      versionSpec,
      arch,
      osPlat,
      manifest
    )

    if (!stableVersion) {
      throw new Error(
        `Unable to find Specmatic version '${versionSpec}' for platform ${osPlat} and architecture ${arch}.`
      )
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
      if (err instanceof Error) {
        core.info(err.message)
      } else {
        core.info(`${err}`)
      }

      core.info('Falling back to download directly from Specmatic')
    }
  }

  if (!downloadPath) {
    info = await getInfoFromDist(versionSpec)
    if (!info) {
      throw new Error(`Unable to find Specmatic version '${versionSpec}'.`)
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
  core.debug(`using manifest: ${JSON.stringify(manifest)}`)
  const rel = await tc.findFromManifest(versionSpec, stable, manifest, arch)

  if (rel && rel.files.length > 0) {
    core.debug(`found version ${rel.version}`)
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

  const script = `#!/usr/bin/env bash

#
# THIS FILE IS AUTOMATICALLY GENERATED
# DO NOT EDIT THIS FILE BY HAND -- YOUR CHANGES WILL BE OVERWRITTEN
#

exec -a ${tool.name} java -jar "${path.join(
    tool.installPath,
    tool.fileName
  )}" "$@"\n`

  const scriptPath = path.join(tool.installPath, tool.name)
  await fs.promises.writeFile(scriptPath, script, {mode: 0o555})

  core.info(`Successfully created executable at ${scriptPath}`)
}

async function getInfoFromDist(
  versionSpec: string
): Promise<ISpecmaticVersionInfo | null> {
  const downloadUrl = `https://github.com/znsio/specmatic/releases/download/${versionSpec}/specmatic.jar`

  return {
    type: 'dist',
    downloadUrl,
    resolvedVersion: versionSpec,
    fileName: 'specmatic.jar',
    installPath: '',
    name: 'specmatic'
  } as ISpecmaticVersionInfo
}

export function parseSpecmaticVersionFile(versionFilePath: string): string {
  const contents = fs.readFileSync(versionFilePath).toString()
  return contents.trim()
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
        i => i.arch === arch && i.filename.includes(platform)
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
