import * as core from '@actions/core'
import * as tc from '@actions/tool-cache'
import cp from 'child_process'
import osm from 'os'
import path from 'path'
import * as main from '../src/main'
import * as im from '../src/installer'

let win32Join = path.win32.join
let posixJoin = path.posix.join

describe('setup-specmatic', () => {
  let inputs = {} as any
  let os = {} as any

  let inSpy: jest.SpyInstance
  let getBooleanInputSpy: jest.SpyInstance
  let exportVarSpy: jest.SpyInstance
  let findSpy: jest.SpyInstance
  let logSpy: jest.SpyInstance
  let dbgSpy: jest.SpyInstance
  let platSpy: jest.SpyInstance
  let archSpy: jest.SpyInstance
  let joinSpy: jest.SpyInstance
  let execSpy: jest.SpyInstance

  beforeAll(async () => {
    // Stub out Environment file functionality so we can verify it writes
    // to standard out (toolkit is backwards compatible)
    process.env['GITHUB_ENV'] = ''
  }, 100000)

  beforeEach(() => {
    // Stub out ENV file functionality so we can verify it writes to standard out
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

    // writes
    logSpy = jest.spyOn(core, 'info')
    dbgSpy = jest.spyOn(core, 'debug')
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
})
