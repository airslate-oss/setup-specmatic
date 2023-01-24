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

async function installSpecmaticVersion(
  info: ISpecmaticVersionInfo
): Promise<string> {
  core.info(`Acquiring ${info.resolvedVersion} from ${info.downloadUrl}`)

  const isWindows = os.platform() === 'win32'
  const tempDir = process.env.RUNNER_TEMP || '.'
  const fileName = isWindows ? path.join(tempDir, info.fileName) : undefined

  const downloadPath = await tc.downloadTool(info.downloadUrl, fileName)
  core.info(`Successfully download specmatic to ${downloadPath}`)

  const localPath = path.join(`${ROOT_PATH}-${info.resolvedVersion}`, FILE_NAME)
  const extPath = await prepareSpecmaticDist(downloadPath, localPath)

  core.info(`Adding ${extPath} to the cache...`)
  const cachedDir = await tc.cacheDir(
    extPath,
    'specmatic',
    info.resolvedVersion,
    undefined
  )
  core.info(`Successfully cached specmatic to ${cachedDir}`)
  return cachedDir
}

export async function prepareSpecmaticDist(
  downloadPath: string,
  localPath: string
): Promise<string> {
  fs.mkdir(path.basename(localPath), {recursive: true}, err => {
    if (err) throw err
  })

  const newPath = path.resolve(localPath)
  fs.rename(downloadPath, newPath, function (err) {
    if (err) throw err
    core.info(`Successfully moved specmatic to ${newPath}`)
  })

  return newPath
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
