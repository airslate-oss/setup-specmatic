// This file is part of the setup-specmatic.
//
// Copyright (c) 2023 airSlate, Inc.
//
// For the full copyright and license information, please view
// the LICENSE file that was distributed with this source code.

import * as core from '@actions/core'
import * as installer from './installer'
import fs from 'fs'
import os from 'os'

export async function run(): Promise<void> {
  try {
    //
    // versionSpec is optional.  If supplied, install / use from the tool cache
    // If not supplied then problem matchers will still be setup.  Useful for self-hosted.
    //
    const versionSpec = resolveVersionInput()
    const arch = os.arch()

    core.info(`Setup specmatic version spec ${versionSpec}`)

    if (versionSpec) {
      const token = core.getInput('token')
      const auth = !token ? undefined : `token ${token}`

      const checkLatest = core.getBooleanInput('check-latest')
      const installDir = await installer.getSpecmatic(
        versionSpec,
        checkLatest,
        auth,
        arch
      )

      core.addPath(installDir)
      core.info('Added specmatic to the path')

      core.info(`Successfully set up Specmatic version ${versionSpec}`)
    }
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

function resolveVersionInput(): string {
  let version = core.getInput('specmatic-version')
  const versionFilePath = core.getInput('specmatic-version-file')

  if (version && versionFilePath) {
    core.warning(
      'Both specmatic-version and specmatic-version-file inputs are specified, only specmatic-version will be used'
    )
  }

  if (version) {
    return version
  }

  if (versionFilePath) {
    if (!fs.existsSync(versionFilePath)) {
      throw new Error(
        `The specified specmatic version file at: ${versionFilePath} does not exist`
      )
    }
    version = installer.parseSpecmaticVersionFile(versionFilePath)
  }

  return version
}
