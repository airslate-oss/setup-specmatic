import cp from 'child_process'
import osm from 'os'
import path from 'path'
import * as im from '../src/installer'

let win32Join = path.win32.join
let posixJoin = path.posix.join

describe('setup-specmatic', () => {
  let os = {} as any

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
})
