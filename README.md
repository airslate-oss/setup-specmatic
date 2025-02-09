<h1 align="center"><code>setup-specmatic</code></h1>
<p align="center">
  <a href="https://github.com/airslate-oss/setup-specmatic/actions/workflows/basic-validation.yml">
    <img alt="Basic validation" src="https://github.com/airslate-oss/setup-specmatic/actions/workflows/basic-validation.yml/badge.svg">
  </a>
  <a href="https://github.com/airslate-oss/setup-specmatic/actions/workflows/versions.yml">
    <img alt="Validate Action" src="https://github.com/airslate-oss/setup-specmatic/actions/workflows/versions.yml/badge.svg">
  </a>
  <a href="https://codecov.io/github/airslate-oss/setup-specmatic">
    <img alt="Coverage status" src="https://codecov.io/github/airslate-oss/setup-specmatic/branch/main/graph/badge.svg">
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
the [releases](https://github.com/znsio/specmatic/releases) of the [specmatic](https://github.com/znsio/specmatic)
repository. To change the default behavior, please use the [check-latest input](#check-latest-version).

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
      specmatic-version: '>=0.61.0'
  - run: specmatic --version
```

## Usage

```yaml
- uses: airslate-oss/setup-specmatic@v1
  with:
    # The specmatic version to download (if necessary) and use.
    #
    # Either specmatic-version or specmatic-version-file is mandatory.
    specmatic-version: ''

    # Path to the version file. Can be any filename.
    # The file must contain the version and nothing else.
    #
    # Either specmatic-version or specmatic-version-file is mandatory.
    specmatic-version-file: ''

    # Set this option to true if you want the action to always check for the
    # latest available version that satisfies the version spec.
    #
    # Default: 'false'
    check-latest: ''

    # Personal access token (PAT) used to fetch the repository. Used
    # to pull node distributions from setup-specmatic. Since there's a
    # default, this is typically not supplied by the user. When running
    # this action on github.com, the default value is sufficient. When
    # running on  GitHub Enterprise Server, you can pass a personal access
    # token for github.com if you are experiencing rate limiting.
    #
    # We recommend using a service account with the least permissions
    # necessary. Also when generating a new PAT, select the least scopes
    # necessary.
    #
    # Default: ${{ github.token }}
    token: ''
```

For details see [action.yml](https://github.com/airslate-oss/setup-specmatic/blob/main/action.yml).

### Scenarios

#### Basic

```yaml
steps:
  - uses: actions/checkout@v3
  - uses: airslate-oss/setup-specmatic@v1
    with:
      # The Specmatic version to download (if necessary) and use.
      specmatic-version: 0.61.0
  - run: specmatic test --testBaseURL='http://127.0.0.1:8030'
```

#### Check latest version

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

#### Using stable/oldstable aliases

If `stable` is provided, action will get the latest stable version from the
[specmatic releases](https://github.com/znsio/specmatic/releases).

If `oldstable` is provided, when current release is 0.61.x, action will resolve version as 0.60.x, where x is the latest
patch release.

#### Getting Specmatic version from the version file

The `specmatic-version-file` input accepts a path to a version file that contains the version of Specmatic to be used by
a project. The version file may contain only major and minor (e.g. 0.61) tags. The action will search for the latest
available patch version sequentially in the runner's directory with the cached tools or at the
[specmatic releases](https://github.com/znsio/specmatic/releases).

If both the `specmatic-version` and the `specmatic-version-file` inputs are provided then the `specmatic-version` input
is used.
> The action will search for the version file relative to the repository root

```yaml
steps:
- uses: actions/checkout@v3
- uses: airslate-oss/setup-specmatic@v1
  with:
    specmatic-version-file: '.specmatic-version'
- run: specmatic --version
```

Example of the `.specmatic-version` file:
```
0.61
```

#### Matrix testing

```yaml
jobs:
  build:
    name: Run contract tests using Specmatic ${{ matrix.specmatic }}
    runs-on: ubuntu-latest

    strategy:
      matrix:
        specmatic: [ 0.59.0, 0.60.0, 0.61.0 ]

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
[GitHub Releases](https://github.com/airslate-oss/setup-specmatic/releases). It’s rigorously tested on Node.js 22+.

If you'd like to contribute to `setup-specmatic` you're most welcome!

## Support

Should you have any question, any remark, or if you find a bug, or if there is something you can't do with the
`setup-specmatic`, please [open an issue](https://github.com/airslate-oss/setup-specmatic/issues).
