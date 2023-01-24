import * as tc from '@actions/tool-cache'
import * as core from '@actions/core'
import * as path from 'path'
import fs from 'fs'
import os from 'os'

const ROOT_PATH = 'specmatic'
const FILE_NAME = 'specmatic.jar'

export interface ISpecmaticVersionInfo {
  downloadUrl: string
  resolvedVersion: string
  fileName: string
}

const getOs = (): string => {
  switch (os.platform()) {
    case 'win32':
      return 'windows'
    case 'darwin':
      return 'macosx'
    default:
      return 'linux'
  }
}

const getFileName = (info: ISpecmaticVersionInfo): string | undefined => {
  const isWindows = getOs() === 'win32'
  const tempDir = process.env.RUNNER_TEMP || '.'
  return isWindows ? path.join(tempDir, info.fileName) : undefined
}

const getLocalDirname = (info: ISpecmaticVersionInfo): string => {
  return `${ROOT_PATH}-${info.resolvedVersion}-${getOs()}`
}

async function installSpecmaticVersion(
  info: ISpecmaticVersionInfo
): Promise<string> {
  core.info(`Acquiring ${info.resolvedVersion} from ${info.downloadUrl}`)

  const downloadPath = await tc.downloadTool(
    info.downloadUrl,
    getFileName(info)
  )
  core.info(`Successfully download specmatic to ${downloadPath}`)

  const localDir = getLocalDirname(info)
  const localPath = path.join(localDir, FILE_NAME)

  await extractSpecmatic(downloadPath, localPath)
  core.info(`Successfully extracted specmatic to ${localPath}`)

  core.info(`Adding ${localDir} to the cache...`)
  const cachedDir = await tc.cacheDir(
    localDir,
    'specmatic',
    info.resolvedVersion,
    undefined
  )
  core.info(`Successfully cached specmatic to ${cachedDir}`)
  return cachedDir
}

async function extractSpecmatic(
  downloadPath: string,
  localPath: string
): Promise<void> {
  const localDir = path.dirname(localPath)

  fs.promises.mkdir(localDir, {recursive: true})
  fs.promises.rename(downloadPath, localPath)
}

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
    throw new Error(
      `Failed to download Specmatic version ${versionSpec}: ${err}`
    )
  }

  return downloadPath
}

export function parseGoVersionFile(versionFilePath: string): string {
  const contents = fs.readFileSync(versionFilePath).toString()
  return contents.trim()
}
