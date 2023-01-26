import * as tc from '@actions/tool-cache'
import * as core from '@actions/core'
import * as path from 'path'
import fs from 'fs'

export interface ISpecmaticVersionInfo {
  downloadUrl: string
  resolvedVersion: string
  fileName: string
}

async function installSpecmaticVersion(
  info: ISpecmaticVersionInfo
): Promise<string> {
  core.info(`Acquiring ${info.resolvedVersion} from ${info.downloadUrl}...`)

  const downloadPath = await tc.downloadTool(info.downloadUrl)
  core.info(`Successfully download specmatic to ${downloadPath}`)

  core.info(`Adding ${downloadPath} to the cache...`)
  const cachedPath = await tc.cacheFile(
    downloadPath,
    'specmatic.jar',
    'specmatic',
    info.resolvedVersion
  )
  core.info(`Successfully cached specmatic to ${cachedPath}`)

  return cachedPath
}

function createExecutable(basePath: string): void {
  core.info('Creating executable...')
  const jarPath = path.join(basePath, 'specmatic.jar')
  const executablePath = path.join(basePath, 'specmatic')

  fs.writeFileSync(executablePath, `#!/bin/sh\nexec java -jar ${jarPath} "$@"`)
  fs.chmodSync(executablePath, 0o555)
  core.info(`Successfully created executable at ${executablePath}`)
}

async function getInfoFromDist(
  versionSpec: string
): Promise<ISpecmaticVersionInfo | null> {
  const downloadUrl = `https://github.com/znsio/specmatic/releases/download/${versionSpec}/specmatic.jar`

  return {
    downloadUrl,
    resolvedVersion: versionSpec,
    fileName: 'specmatic.jar'
  } as ISpecmaticVersionInfo
}

export async function getSpecmatic(versionSpec: string): Promise<string> {
  core.info(`Attempting to download ${versionSpec}...`)

  let downloadPath = ''
  let info: ISpecmaticVersionInfo | null = null

  info = await getInfoFromDist(versionSpec)
  if (!info) {
    throw new Error(`Unable to find Specmatic version '${versionSpec}'.`)
  }

  try {
    downloadPath = await installSpecmaticVersion(info)
    createExecutable(downloadPath)
  } catch (err) {
    throw new Error(`Failed to install specmatic v${versionSpec}: ${err}`)
  }

  return downloadPath
}

export function parseSpecmaticVersionFile(versionFilePath: string): string {
  const contents = fs.readFileSync(versionFilePath).toString()
  return contents.trim()
}
