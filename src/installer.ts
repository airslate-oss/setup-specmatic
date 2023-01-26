import * as tc from '@actions/tool-cache'
import * as core from '@actions/core'
import * as path from 'path'
import fs from 'fs'

export interface ISpecmaticVersionInfo {
  downloadUrl: string
  resolvedVersion: string
  fileName: string
  installPath: string
  name: string
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
    info.fileName,
    info.name,
    info.resolvedVersion
  )
  core.info(`Successfully cached specmatic to ${cachedPath}`)
  info.installPath = cachedPath

  await writeJarScript(info)

  return cachedPath
}

async function writeJarScript(tool: ISpecmaticVersionInfo): Promise<void> {
  core.info('Creating executable...')

  const script = `#!/usr/bin/env bash
  exec -a ${tool.name} java -jar ${path.join(
    tool.installPath,
    tool.fileName
  )} "$@"`

  const scriptPath = path.join(tool.installPath, tool.name)
  await fs.promises.writeFile(scriptPath, script, {mode: 0o555})

  core.info(`Successfully created executable at ${scriptPath}`)
}

async function getInfoFromDist(
  versionSpec: string
): Promise<ISpecmaticVersionInfo | null> {
  const downloadUrl = `https://github.com/znsio/specmatic/releases/download/${versionSpec}/specmatic.jar`

  return {
    downloadUrl,
    resolvedVersion: versionSpec,
    fileName: 'specmatic.jar',
    installPath: '',
    name: 'specmatic'
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
  } catch (err) {
    throw new Error(`Failed to install specmatic v${versionSpec}: ${err}`)
  }

  return downloadPath
}

export function parseSpecmaticVersionFile(versionFilePath: string): string {
  const contents = fs.readFileSync(versionFilePath).toString()
  return contents.trim()
}
