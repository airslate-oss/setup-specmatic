<h1 align="center"><code>setup-specmatic</code></h1>
<p align="center">
  <a href="https://github.com/airslate-oss/setup-specmatic/actions/workflows/ci.yml">
    <img alt="CI" src="https://github.com/airslate-oss/setup-specmatic/actions/workflows/ci.yml/badge.svg">
  </a>
  <a href="https://github.com/airslate-oss/setup-specmatic/actions/workflows/cd.yml">
    <img alt="CD" src="https://github.com/airslate-oss/setup-specmatic/actions/workflows/cd.yml/badge.svg">
  </a>
  <a href="https://github.com/airslate-oss/setup-specmatic/actions/workflows/codeql.yml">
    <img alt="CodeQL" src="https://github.com/airslate-oss/setup-specmatic/actions/workflows/codeql.yml/badge.svg">
  </a>
</p>

`setup-specmatic` is an action to set up a [Specmatic](https://specmatic.in) environment for use in actions by
optionally downloading and caching a version of specmatic by version and adding to `PATH`.

## V1

The action offers:

- Creates shell wrapper to call just `specmatic` instead of `java -jar specmatic.jar`
- Adds `specmatic` to the `PATH`
- Check latest version
- Speeds up Specmatic deployment by using caching mechanics and asynchronous approach
- The `stable` and `oldstable` aliases
- Bug Fixes (including issues around version matching and semver)

The action will first check the local cache for a version match.  If a version is not found locally, it will pull it from
the `main` branch of the [setup-specmatic](https://github.com/airslate-oss/setup-specmatic/blob/main/versions-manifest.json)
repository. To change the default behavior, please use the [check-latest input](#check-latest-version).

Supported runner OSes are:
- macOS
- Linux

Supported OS architectures are:
- x64

**Note:** The `setup-specmatic` action uses packages which are built by Specmatic side.
The action does not build JAR files from source code.

Matching by [semver spec](https://github.com/npm/node-semver):

```yaml
steps:
  - uses: actions/checkout@v3
  - uses: airslate-oss/setup-specmatic@v1
    with:
      # The Specmatic version to download (if necessary) and use.
      specmatic-version: '^0.39.1'
  - run: specmatic --version
```

```yaml
steps:
  - uses: actions/checkout@v3
  - uses: airslate-oss/setup-specmatic@v1
    with:
      specmatic-version: '>=0.59.0'
  - run: specmatic --version
```

## Usage

See [action.yml](https://github.com/airslate-oss/setup-specmatic/blob/main/action.yml)

### Basic

```yaml
steps:
  - uses: actions/checkout@v3
  - uses: airslate-oss/setup-specmatic@v1
    with:
      # The Specmatic version to download (if necessary) and use.
      specmatic-version: 0.59.0
  - run: specmatic test --testBaseURL='http://127.0.0.1:8030'
```

### Check latest version

The `check-latest` flag defaults to `false`. Use the default or set `check-latest` to `false` if you prefer stability
and if you want to ensure a specific Specmatic version is always used.

If `check-latest` is set to `true`, the action first checks if the cached version is the latest one. If the locally
cached version is not the most up-to-date, a Specmatic version will then be downloaded. Set `check-latest` to `true`
if you want the most up-to-date Go version to always be used.

> Setting `check-latest` to `true` has performance implications as downloading Specmatic versions is slower than using cached versions.

```yaml
steps:
  - uses: actions/checkout@v3
  - uses: airslate-oss/setup-specmatic@v1
    with:
      specmatic-version: '0.36'
      check-latest: true
  - run: specmatic test --testBaseURL='http://127.0.0.1:8030'
```

### Using stable/oldstable aliases

If `stable` is provided, action will get the latest stable version from the
[setup-specmatic](https://github.com/airslate-oss/setup-specmatic/blob/main/versions-manifest.json) repository manifest.

If `oldstable` is provided, when current release is 0.59.x, action will resolve version as 0.58.x, where x is the latest patch release.

### Matrix testing

```yaml
jobs:
  build:
    name: Run contract tests using Specmatic ${{ matrix.specmatic }}
    runs-on: ubuntu-latest

    strategy:
      matrix:
        specmatic: [ 0.40.0, 0.59.0 ]

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup specmatic
        uses: airslate-oss/setup-specmatic@v1
        with:
          specmatic-version: ${{ matrix.specmatic }}

      - run: specmatic test --testBaseURL='http://127.0.0.1:8030'
```

## Project Information

`setup-specmatic` is released under the [Apache License 2.0](https://choosealicense.com/licenses/apache-2.0/),
the code lives on [GitHub](https://github.com/airslate-oss/python-airslate), and the latest release on
[GitHub Releases](https://github.com/airslate-oss/setup-specmatic/releases). It’s rigorously tested on Node.js 16+.

If you'd like to contribute to `setup-specmatic` you're most welcome!

## Support

Should you have any question, any remark, or if you find a bug, or if there is something you can't do with the
`setup-specmatic`, please [open an issue](https://github.com/airslate-oss/setup-specmatic/issues).
