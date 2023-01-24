import * as tc from '@actions/tool-cache'
import * as core from '@actions/core'
import * as path from 'path'
import fs from 'fs'
import os from 'os'

export const TOOL_NAME = 'specmatic'

const FILE_NAME = `${TOOL_NAME}.jar`
// const ROOT_PATH = `${TOOL_NAME}`

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
//   return `${ROOT_PATH}-${info.resolvedVersion}}`
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
  // const localPath = path.join(localDir, FILE_NAME)

  // await extractSpecmatic(downloadPath, localPath)
  // core.info(`Successfully extracted specmatic to ${localPath}`)

  core.info(`Adding ${downloadPath} to the cache...`)
  const cachedDir = await tc.cacheDir(
    downloadPath,
    'specmatic',
    info.resolvedVersion,
    undefined
  )
  core.info(`Successfully cached specmatic to ${cachedDir}`)

  const jarPath = path.join(cachedDir, FILE_NAME)
  const executablePath = path.join(cachedDir, TOOL_NAME)

  fs.writeFileSync(executablePath, `#!/bin/sh\nexec java -jar ${jarPath} "$@"`)
  fs.chmodSync(executablePath, 0o555)

  return cachedDir
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
//   const jarPath = path.join(basePath, FILE_NAME)
//   const executablePath = path.join(basePath, TOOL_NAME)

//   fs.writeFileSync(executablePath, `#!/bin/sh\nexec java -jar ${jarPath} "$@"`)
//   fs.chmodSync(executablePath, 0o555)
// }

async function getInfoFromDist(
  versionSpec: string
): Promise<ISpecmaticVersionInfo | null> {
  const downloadUrl = `https://github.com/znsio/specmatic/releases/download/${versionSpec}/${FILE_NAME}`

  return {
    downloadUrl,
    resolvedVersion: versionSpec,
    fileName: FILE_NAME
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
    core.info('Install from dist')
    downloadPath = await installSpecmaticVersion(info)
  } catch (err) {
    throw new Error(`Failed to install specmatic v${versionSpec}: ${err}`)
  }

  return downloadPath
}

export function parseGoVersionFile(versionFilePath: string): string {
  const contents = fs.readFileSync(versionFilePath).toString()
  return contents.trim()
}
