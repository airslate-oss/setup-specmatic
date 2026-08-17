# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

This file starts at 1.8.0. Earlier releases are described on the
[releases page](https://github.com/airslate-oss/setup-specmatic/releases).

## [Unreleased]

## [1.8.1] - 2026-08-18

### Fixed

- Version resolution no longer aborts when the upstream Specmatic repository
  publishes a release tag that carries no attached artifacts. Releases such as
  `2.52.0` and `2.53.0` ship without a `specmatic.jar`, which made every run
  fail with `TypeError: Cannot read properties of undefined (reading
  'browser_download_url')` — including runs that requested an entirely
  different version. Such releases are now skipped while the version manifest
  is built, so `stable`, `oldstable`, and explicit version specs again resolve
  to the newest installable release.
  ([#817](https://github.com/airslate-oss/setup-specmatic/pull/817))

### Security

- Updated the bundled `undici` to 6.28.0, which addresses CRLF injection
  through a blob-like body `type` property
  ([GHSA-m8rv-5g2x-5cg5](https://github.com/advisories/GHSA-m8rv-5g2x-5cg5)),
  downstream response desynchronization in the retry interceptor
  ([GHSA-8xcm-r25x-g524](https://github.com/advisories/GHSA-8xcm-r25x-g524)),
  and cookie attribute injection via unsanitized `domain` and `setCookie`
  values
  ([GHSA-v3r7-h72x-cjcm](https://github.com/advisories/GHSA-v3r7-h72x-cjcm)).
  ([#817](https://github.com/airslate-oss/setup-specmatic/pull/817))

## [1.8.0] - 2026-07-20

### Changed

- The action now runs on the Node 20 runtime (`using: node20`) and its sources
  ship as ES modules. Self-hosted runners and GitHub Enterprise Server
  installations must provide a runner release that supports `node20`.
  ([#786](https://github.com/airslate-oss/setup-specmatic/pull/786))

[Unreleased]: https://github.com/airslate-oss/setup-specmatic/compare/v1.8.1...HEAD
[1.8.1]: https://github.com/airslate-oss/setup-specmatic/compare/v1.8.0...v1.8.1
[1.8.0]: https://github.com/airslate-oss/setup-specmatic/compare/v1.7.4...v1.8.0
