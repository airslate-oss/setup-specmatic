import * as core from '@actions/core'
import * as installer from './installer';
import {wait} from './wait'
import fs from 'fs';

async function run(): Promise<void> {
  try {
    //
    // versionSpec is optional.  If supplied, install / use from the tool cache
    // If not supplied then problem matchers will still be setup.  Useful for self-hosted.
    //
    const versionSpec = resolveVersionInput();
    core.info(`Setup specmatic version spec ${versionSpec}`);

    const ms: string = core.getInput('milliseconds')
    core.debug(`Waiting ${ms} milliseconds ...`) // debug is only output if you set the secret `ACTIONS_STEP_DEBUG` to true

    core.debug(new Date().toTimeString())
    await wait(parseInt(ms, 10))
    core.debug(new Date().toTimeString())

    core.setOutput('time', new Date().toTimeString())
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

function resolveVersionInput(): string {
  let version = core.getInput('specmatic-version');
  const versionFilePath = core.getInput('specmatic-version-file');

  if (version && versionFilePath) {
    core.warning(
      'Both specmatic-version and specmatic-version-file inputs are specified, only specmatic-version will be used'
    );
  }

  if (version) {
    return version;
  }

  if (versionFilePath) {
    if (!fs.existsSync(versionFilePath)) {
      throw new Error(
        `The specified specmatic version file at: ${versionFilePath} does not exist`
      );
    }
    version = installer.parseGoVersionFile(versionFilePath);
  }

  return version;
}

run()
