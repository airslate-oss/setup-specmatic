// The project is ESM (see package.json "type": "module") and ships an ESM
// bundle as the action runtime. Tests, however, run under ts-jest in CJS
// mode on purpose: Node ESM module namespaces are frozen, so the existing
// `jest.spyOn(namespaceImport, '...')` pattern throws "Cannot assign to
// read only property" under Jest's ESM runner. Compiling tests to CJS keeps
// that pattern working. The moduleNameMapper + transformIgnorePatterns
// entries below route around @actions/* packages' ESM-only `exports` field
// (no `require` condition) by pointing directly at their entry files and
// letting ts-jest transform them to CJS.

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  clearMocks: true,
  moduleFileExtensions: ['js', 'ts'],
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  testRunner: 'jest-circus/runner',
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    // Redirect @actions/* packages past their exports field to their ESM
    // entry files. ts-jest then transforms them to CJS via the transform
    // rule below.
    '^@actions/core$':
      '<rootDir>/node_modules/@actions/core/lib/core.js',
    '^@actions/tool-cache$':
      '<rootDir>/node_modules/@actions/tool-cache/lib/tool-cache.js',
    '^@actions/io$':
      '<rootDir>/node_modules/@actions/io/lib/io.js',
    '^@actions/http-client$':
      '<rootDir>/node_modules/@actions/http-client/lib/index.js',
    '^@actions/exec$':
      '<rootDir>/node_modules/@actions/exec/lib/exec.js',
    // Deep subpath imports inside @actions packages (e.g. the transitive
    // '@actions/http-client/lib/auth' used by @actions/core).
    '^@actions/([^/]+)/lib/(.*?)(?:\\.js)?$':
      '<rootDir>/node_modules/@actions/$1/lib/$2.js'
  },
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'CommonJS',
          moduleResolution: 'Node',
          target: 'ES2022',
          esModuleInterop: true,
          resolveJsonModule: true,
          allowJs: true,
          types: ['jest', 'node']
        }
      }
    ]
  },
  transformIgnorePatterns: ['/node_modules/(?!@actions/)'],
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
  testTimeout: 10000
}
