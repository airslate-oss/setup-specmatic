import * as core from '@actions/core'
import * as io from '@actions/io'
import * as tc from '@actions/tool-cache'
import fs from 'fs'
import cp from 'child_process'
import osm from 'os'
import path from 'path'
import * as main from '../src/main'
import * as im from '../src/installer'

let testManifest = require('./data/versions-manifest.json')
let win32Join = path.win32.join
let posixJoin = path.posix.join

describe('setup-specmatic', () => {
  let inputs = {} as any
  let os = {} as any

  let inSpy: jest.SpyInstance
  let getBooleanInputSpy: jest.SpyInstance
  let exportVarSpy: jest.SpyInstance
  let findSpy: jest.SpyInstance
  let cnSpy: jest.SpyInstance
  let logSpy: jest.SpyInstance
  let dbgSpy: jest.SpyInstance
  let platSpy: jest.SpyInstance
  let archSpy: jest.SpyInstance
  let joinSpy: jest.SpyInstance
  let dlSpy: jest.SpyInstance
  let cacheSpy: jest.SpyInstance
  let existsSpy: jest.SpyInstance
  let readFileSpy: jest.SpyInstance
  let execSpy: jest.SpyInstance
  let writeFileSpy: jest.SpyInstance
  let getManifestSpy: jest.SpyInstance

  beforeAll(async () => {
    // Stub out ENV file functionality so we can verify it writes
    // to standard out (toolkit is backwards compatible)
    process.env['GITHUB_ENV'] = ''
  }, 100000)

  beforeEach(() => {
    // Stub out PATH file functionality so we can verify it writes
    // to standard out (toolkit is backwards compatible)
    process.env['GITHUB_PATH'] = ''

    // @actions/core
    inputs = {}
    inSpy = jest.spyOn(core, 'getInput')
    inSpy.mockImplementation(name => inputs[name])
    getBooleanInputSpy = jest.spyOn(core, 'getBooleanInput')
    getBooleanInputSpy.mockImplementation(name => inputs[name])
    exportVarSpy = jest.spyOn(core, 'exportVariable')

    // node
    os = {}
    platSpy = jest.spyOn(osm, 'platform')
    platSpy.mockImplementation(() => os['platform'])
    archSpy = jest.spyOn(osm, 'arch')
    archSpy.mockImplementation(() => os['arch'])
    execSpy = jest.spyOn(cp, 'execSync')

    // switch path join behavior based on set os.platform
    joinSpy = jest.spyOn(path, 'join')
    joinSpy.mockImplementation((...paths: string[]): string => {
      if (os['platform'] == 'win32') {
        return win32Join(...paths)
      }
      return posixJoin(...paths)
    })

    // @actions/tool-cache
    findSpy = jest.spyOn(tc, 'find')
    dlSpy = jest.spyOn(tc, 'downloadTool')
    cacheSpy = jest.spyOn(tc, 'cacheFile')
    getManifestSpy = jest.spyOn(tc, 'getManifestFromRepo')

    // io
    existsSpy = jest.spyOn(fs, 'existsSync')
    readFileSpy = jest.spyOn(fs, 'readFileSync')
    writeFileSpy = jest.spyOn(fs.promises, 'writeFile')

    // gets
    getManifestSpy.mockImplementation(() => <tc.IToolRelease[]>testManifest)

    // writes
    cnSpy = jest.spyOn(process.stdout, 'write')
    logSpy = jest.spyOn(core, 'info')
    dbgSpy = jest.spyOn(core, 'debug')
    cnSpy.mockImplementation(line => {
      // uncomment to debug
      // process.stderr.write('write:' + line + '\n')
    })
    logSpy.mockImplementation(line => {
      // uncomment to debug
      // process.stderr.write('log:' + line + '\n')
    })
    dbgSpy.mockImplementation(msg => {
      // uncomment to see debug output
      // process.stderr.write(msg + '\n')
    })
  })

  afterAll(async () => {
    jest.restoreAllMocks()
  }, 100000)

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('can find 0.58.0 from manifest on osx', async () => {
    os.platform = 'darwin'
    os.arch = 'x64'

    let match = await im.getInfoFromManifest('0.58.0', true, 'mocktoken')

    expect(match).toBeDefined()
    expect(match!.resolvedVersion).toBe('0.58.0')
    expect(match!.type).toBe('manifest')
    expect(match!.downloadUrl).toBe(
      'https://github.com/znsio/specmatic/releases/download/0.58.0/specmatic.jar'
    )
  })

  it('can find 0.39 from manifest on linux', async () => {
    os.platform = 'linux'
    os.arch = 'x64'

    let match = await im.getInfoFromManifest('0.39', true, 'mocktoken')

    expect(match).toBeDefined()
    expect(match!.resolvedVersion).toBe('0.39.1')
    expect(match!.type).toBe('manifest')
    expect(match!.downloadUrl).toBe(
      'https://github.com/znsio/specmatic/releases/download/0.39.1/specmatic.jar'
    )
  })

  it('can find 0.39 from manifest on windows', async () => {
    os.platform = 'win32'
    os.arch = 'x64'

    let match = await im.getInfoFromManifest('0.39', true, 'mocktoken')

    expect(match).toBeDefined()
    expect(match!.resolvedVersion).toBe('0.39.1')
    expect(match!.type).toBe('manifest')
    expect(match!.downloadUrl).toBe(
      'https://github.com/znsio/specmatic/releases/download/0.39.1/specmatic.jar'
    )
  })

  it('evaluates to stable with input as true', async () => {
    inputs['specmatic-version'] = '0.58.0'
    inputs.stable = 'true'

    let toolPath = path.normalize('/cache/specmatic/0.58.0/x64')
    findSpy.mockImplementation(() => toolPath)
    await main.run()

    expect(logSpy).toHaveBeenCalledWith(`Setup specmatic version spec 0.58.0`)
  })

  it('evaluates to stable with no input', async () => {
    inputs['specmatic-version'] = '0.58.0'

    inSpy.mockImplementation(name => inputs[name])

    let toolPath = path.normalize('/cache/specmatic/0.58.0/x64')
    findSpy.mockImplementation(() => toolPath)
    await main.run()

    expect(logSpy).toHaveBeenCalledWith(`Setup specmatic version spec 0.58.0`)
  })

  it('finds a version of specmatic already in the cache', async () => {
    inputs['specmatic-version'] = '0.59.0'

    let toolPath = path.normalize('/cache/specmatic/0.59.0/x64')
    findSpy.mockImplementation(() => toolPath)
    await main.run()

    expect(logSpy).toHaveBeenCalledWith(`Found in cache: ${toolPath}`)
  })

  it('finds a version in the cache and adds it to the path', async () => {
    inputs['specmatic-version'] = '0.59.0'

    let toolPath = path.normalize('/cache/specmatic/0.59.0/x64')
    findSpy.mockImplementation(() => toolPath)
    await main.run()

    expect(cnSpy).toHaveBeenCalledWith(`::add-path::${toolPath}${osm.EOL}`)
  })

  it('handles unhandled error and reports error', async () => {
    inputs['specmatic-version'] = '0.59.0'
    const errMsg = 'unhandled error message'

    findSpy.mockImplementation(() => {
      throw new Error(errMsg)
    })
    await main.run()

    expect(cnSpy).toHaveBeenCalledWith('::error::' + errMsg + osm.EOL)
  })

  it('downloads a version not in the cache', async () => {
    os.platform = 'linux'
    os.arch = 'x64'

    inputs['specmatic-version'] = '0.39.1'

    findSpy.mockImplementation(() => '')
    dlSpy.mockImplementation(() => '/some/temp/path')
    let toolPath = path.normalize('/cache/specmatic/0.39.0/x64')
    cacheSpy.mockImplementation(() => toolPath)
    writeFileSpy.mockImplementation()
    await main.run()

    expect(dlSpy).toHaveBeenCalled()
    expect(cnSpy).toHaveBeenCalledWith(`::add-path::${toolPath}${osm.EOL}`)
  })

  it('does not find a version that does not exist', async () => {
    os.platform = 'linux'
    os.arch = 'x64'

    inputs['specmatic-version'] = '99.99.9'

    findSpy.mockImplementation(() => '')
    await main.run()

    expect(cnSpy).toHaveBeenCalledWith(
      `::error::Unable to find Specmatic version '99.99.9' for platform linux and architecture x64.${osm.EOL}`
    )
  })

  it('downloads a version from a manifest match', async () => {
    os.platform = 'linux'
    os.arch = 'x64'

    let versionSpec = '0.55.0'

    inputs['specmatic-version'] = versionSpec
    inputs['token'] = 'faketoken'

    let expectedUrl =
      'https://github.com/znsio/specmatic/releases/download/0.55.0/specmatic.jar'

    findSpy.mockImplementation(() => '')

    dlSpy.mockImplementation(async () => '/some/temp/path')
    let toolPath = path.normalize('/cache/specmatic/0.55.0/x64')
    cacheSpy.mockImplementation(async () => toolPath)
    writeFileSpy.mockImplementation()

    await main.run()

    expect(dlSpy).toHaveBeenCalled()
    expect(logSpy).not.toHaveBeenCalledWith(
      'Not found in manifest.  Falling back to download directly from Specmatic'
    )
    expect(logSpy).toHaveBeenCalledWith(
      `Acquiring 0.55.0 from ${expectedUrl}...`
    )

    expect(logSpy).toHaveBeenCalledWith('Added specmatic to the path')
    expect(cnSpy).toHaveBeenCalledWith(`::add-path::${toolPath}${osm.EOL}`)
  })

  describe('check-latest flag', () => {
    it("use local version and don't check manifest if check-latest is not specified", async () => {
      os.platform = 'linux'
      os.arch = 'x64'

      inputs['specmatic-version'] = '0.39'
      inputs['check-latest'] = false

      const toolPath = path.normalize('/cache/specmatic/0.39.0/x64')
      findSpy.mockReturnValue(toolPath)
      await main.run()

      expect(logSpy).toHaveBeenCalledWith(`Found in cache: ${toolPath}`)
      expect(logSpy).not.toHaveBeenCalledWith(
        'Attempting to resolve the latest version from the manifest...'
      )
    })

    it('check latest version and resolve it from local cache', async () => {
      os.platform = 'linux'
      os.arch = 'x64'

      inputs['specmatic-version'] = '0.39'
      inputs['check-latest'] = true

      const toolPath = path.normalize('/cache/specmatic/0.39.1/x64')
      findSpy.mockReturnValue(toolPath)
      dlSpy.mockImplementation(async () => '/some/temp/path')
      cacheSpy.mockImplementation(async () => toolPath)
      writeFileSpy.mockImplementation()

      await main.run()

      expect(logSpy).toHaveBeenCalledWith('Setup specmatic version spec 0.39')
      expect(logSpy).toHaveBeenCalledWith(`Found in cache: ${toolPath}`)
    })

    it('check latest version and install it from manifest', async () => {
      const arch = 'x64'
      os.platform = 'linux'
      os.arch = arch

      const versionSpec = '0.36'
      const patchVersion = '0.36.1'
      inputs['specmatic-version'] = versionSpec
      inputs['stable'] = 'true'
      inputs['check-latest'] = true

      findSpy.mockImplementation(() => '')
      dlSpy.mockImplementation(async () => '/some/temp/path')
      const toolPath = path.normalize(
        `/cache/specmatic/${patchVersion}/${arch}`
      )
      cacheSpy.mockImplementation(async () => toolPath)
      writeFileSpy.mockImplementation()

      await main.run()

      expect(logSpy).toHaveBeenCalledWith(
        `Setup specmatic version spec ${versionSpec}`
      )
      expect(logSpy).toHaveBeenCalledWith(
        'Attempting to resolve the latest version from the manifest...'
      )
      expect(logSpy).toHaveBeenCalledWith(`Resolved as '${patchVersion}'`)
      expect(logSpy).toHaveBeenCalledWith(
        `Attempting to download ${patchVersion}...`
      )
      expect(logSpy).toHaveBeenCalledWith('Adding to the cache...')
      expect(logSpy).toHaveBeenCalledWith('Added specmatic to the path')
      expect(logSpy).toHaveBeenCalledWith(
        `Successfully set up Specmatic version ${versionSpec}`
      )
    })
  })

  describe('specmatic-version-file', () => {
    const versionFileContents = '0.42'

    it('reads version from .specmatic-version', async () => {
      inputs['specmatic-version-file'] = '.specmatic-version'

      existsSpy.mockImplementation(() => true)
      readFileSpy.mockImplementation(() => Buffer.from(versionFileContents))

      await main.run()

      expect(logSpy).toHaveBeenCalledWith('Setup specmatic version spec 0.42')
      expect(logSpy).toHaveBeenCalledWith('Attempting to download 0.42...')
      expect(dbgSpy).toHaveBeenCalledWith('matching 0.42...')
    })

    it('is overwritten by specmatic-version', async () => {
      inputs['specmatic-version'] = '0.36.1'
      inputs['specmatic-version-file'] = '.specmatic-version'

      existsSpy.mockImplementation(() => true)
      readFileSpy.mockImplementation(() => Buffer.from(versionFileContents))

      await main.run()

      expect(logSpy).toHaveBeenCalledWith('Setup specmatic version spec 0.36.1')
      expect(logSpy).toHaveBeenCalledWith('Attempting to download 0.36.1...')
      expect(dbgSpy).toHaveBeenCalledWith('matching 0.36.1...')
    })

    it('reports a read failure', async () => {
      inputs['specmatic-version-file'] = '.specmatic-version'
      existsSpy.mockImplementation(() => false)

      await main.run()

      expect(cnSpy).toHaveBeenCalledWith(
        `::error::The specified specmatic version file at: .specmatic-version does not exist${osm.EOL}`
      )
    })
  })

  describe('stable/oldstable aliases', () => {
    it.each(['stable', 'oldstable'])(
      'acquires latest specmatic version with %s specmatic-version input',
      async (alias: string) => {
        const arch = 'x64'
        os.platform = 'darwin'
        os.arch = arch

        inputs['specmatic-version'] = alias
        inputs['architecture'] = os.arch

        findSpy.mockImplementation(() => '')
        dlSpy.mockImplementation(async () => '/some/temp/path')
        let toolPath = path.normalize(`/cache/specmatic/${alias}/${arch}`)
        cacheSpy.mockImplementation(async () => toolPath)

        await main.run()

        const releaseIndex = alias === 'stable' ? 0 : 1
        expect(logSpy).toHaveBeenCalledWith(
          `${alias} version resolved as ${testManifest[releaseIndex].version}`
        )
      }
    )
  })
})
