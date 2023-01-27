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

`setup-specmatic` is an action to set up a [Specmatic](https://specmatic.in) environment for use in actions by:

- Optionally downloading and caching a version of specmatic by version and adding to `PATH`.

## Features

The action offers:

- Creates shell wrapper to call just `specmatic` instead of `java -jar specmatic.jar`
- Adds `specmatic` to the `PATH`
- Speeds up specmatic deployment by using caching mechanics and asynchronous approach

The action will first check the local cache for a version match.  If a version is not found locally,
it will pull it from [specmatic releases](https://github.com/znsio/specmatic/releases).

**Note:** The `setup-specmatic` action uses packages which are built by specmatic side.
The action does not build golang from source code.

## Usage

See [action.yml](https://github.com/airslate-oss/setup-specmatic/blob/main/action.yml)

### Basic

```yaml
steps:
  - uses: actions/checkout@v3
  - uses: actions/setup-specmatic@v1
    with:
      specmatic-version: 0.59.0 # The Specmatic version to download (if necessary) and use.
  - run: specmatic test --testBaseURL='http://127.0.0.1:8030'
```

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
        uses: actions/setup-specmatic@v1
        with:
          specmatic-version: ${{ matrix.specmatic }}

      - run: specmatic test --testBaseURL='http://127.0.0.1:8030'
```

## Project Information

`setup-specmatic` is released under the [Apache License 2.0](https://choosealicense.com/licenses/apache-2.0/),
the code lives on [GitHub](https://github.com/airslate-oss/python-airslate), and the latest release on GitHub Releases.
It’s rigorously tested on Node.js 16+.

If you'd like to contribute to `setup-specmatic` you're most welcome!

## Support

Should you have any question, any remark, or if you find a bug, or if there is something you can't do with the
`setup-specmatic`, please [open an issue](https://github.com/airslate-oss/setup-specmatic/issues).
