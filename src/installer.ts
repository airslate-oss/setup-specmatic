import * as tc from '@actions/tool-cache'
import * as core from '@actions/core'
import * as path from 'path'
import fs from 'fs'
import os from 'os'

export interface ISpecmaticVersionInfo {
  downloadUrl: string
  resolvedVersion: string
  fileName: string
}

const getFileName = (info: ISpecmaticVersionInfo): string | undefined => {
  const isWindows = os.platform() === 'win32'
  const tempDir = process.env.RUNNER_TEMP || '.'
  return isWindows ? path.join(tempDir, info.fileName) : undefined
}

// const getLocalDirname = (info: ISpecmaticVersionInfo): string => {
//   return `specmatic-${info.resolvedVersion}}`
// }

async function installSpecmaticVersion(
  info: ISpecmaticVersionInfo
): Promise<string> {
  core.info(`Acquiring ${info.resolvedVersion} from ${info.downloadUrl}`)

  const downloadPath = await tc.downloadTool(
    info.downloadUrl,
    getFileName(info)
  )
  core.info(`Successfully download specmatic to ${downloadPath}`)

  // const localDir = getLocalDirname(info)
  // const localPath = path.join(localDir, 'specmatic.jar')

  // await extractSpecmatic(downloadPath, localPath)
  // core.info(`Successfully extracted specmatic to ${localPath}`)

  // core.info(`Adding ${localDir} to the cache...`)
  core.info(`Adding ${downloadPath} to the cache...`)
  const cachedPath = await tc.cacheDir(
    downloadPath,
    'specmatic',
    info.resolvedVersion,
    undefined
  )
  core.info(`Successfully cached specmatic to ${cachedPath}`)

  const jarPath = path.join(cachedPath, 'specmatic.jar')
  const executablePath = path.join(cachedPath, 'specmatic')

  fs.writeFileSync(executablePath, `#!/bin/sh\nexec java -jar ${jarPath} "$@"`)
  fs.chmodSync(executablePath, 0o555)

  return cachedPath
}

// async function extractSpecmatic(
//   downloadPath: string,
//   localPath: string
// ): Promise<void> {
//   const localDir = path.dirname(localPath)

//   fs.promises.mkdir(localDir, {recursive: true})
//   fs.promises.rename(downloadPath, localPath)
// }

// async function createExecutable(basePath: string): Promise<void> {
//   const jarPath = path.join(basePath, 'specmatic.jar')
//   const executablePath = path.join(basePath, 'specmatic')

//   fs.writeFileSync(executablePath, `#!/bin/sh\nexec java -jar ${jarPath} "$@"`)
//   fs.chmodSync(executablePath, 0o555)
// }

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
    // createExecutable(downloadPath)
  } catch (err) {
    throw new Error(`Failed to install specmatic v${versionSpec}: ${err}`)
  }

  return downloadPath
}

export function parseSpecmaticVersionFile(versionFilePath: string): string {
  const contents = fs.readFileSync(versionFilePath).toString()
  return contents.trim()
}
