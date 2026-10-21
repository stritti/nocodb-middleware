# Versioning Strategy

This project follows **Semantic Versioning (SemVer)** — `MAJOR.MINOR.PATCH` —
as defined at <https://semver.org>.

## Version Format

| Segment   | When it changes                                   |
| --------- | ------------------------------------------------- |
| **MAJOR** | Backwards-incompatible changes                    |
| **MINOR** | New, backwards-compatible features                |
| **PATCH** | Backwards-compatible fixes and small improvements |

## Conventional Commits

Release Please reads Conventional Commit messages since the previous release.
Use these prefixes in commit and pull request titles:

| Prefix                                      | Release    |
| ------------------------------------------- | ---------- |
| `fix:`, `perf:`, `refactor:`                | Patch      |
| `feat:`                                     | Minor      |
| `!:`, or a `BREAKING CHANGE:` footer        | Major      |
| `docs:`, `chore:`, `ci:`, `test:`, `style:` | No release |

Breaking changes can be marked in the type, for example `feat!: remove v1 API`,
or in the commit body:

```text
feat: replace the request client

BREAKING CHANGE: The httpClient option is removed.
```

## Release Workflow

Releases are managed by [`.github/workflows/release-please.yml`](../.github/workflows/release-please.yml)
and the root-level `release-please-config.json` and `.release-please-manifest.json`.

### Release pull requests

On every push to `main`, Release Please reads Conventional Commit messages since
the last release and opens or updates a release pull request when a version bump
is due. The pull request updates `package.json`, `package-lock.json` and
`CHANGELOG.md`. Review the generated version and changelog like any other change.

After the release pull request is merged, Release Please creates the Git tag and
GitHub Release. It does not publish an npm package or a container image.

The workflow can also be started manually from **Actions → Release Please → Run
workflow**. This runs the same release-pull-request calculation; it no longer
accepts a manual `bump_type`. Use a Conventional Commit such as `feat:` or
`fix:` to select the release level.

### Action token

The workflow uses `GITHUB_TOKEN` by default. To make workflows such as CI run on
the generated release pull request, configure a repository secret named
`RELEASE_PLEASE_TOKEN` with a token permitted to create pull requests and write
repository contents. The workflow prefers that secret when present and falls
back to `GITHUB_TOKEN` otherwise. Follow your organization's token policy and
grant only the required repository access.

## Current Version

The latest published GitHub Release is `v0.6.0`. The repository also contains a
`v0.6.1` tag and matching package version on a commit that is not part of `main`.
The Release Please manifest starts at `0.6.1` so a future release does not try to
reuse that existing tag. The package files on `main` are updated by the next
generated release pull request.

Version `0.x.y` means the public API is not yet stable. Once the API is
considered stable, the project can move to `1.0.0` with a major release.

## Changelog

Release Please updates `CHANGELOG.md` in the release pull request. GitHub also
generates release notes when the GitHub Release is created. See the
[Releases page](https://github.com/stritti/nocodb-middleware/releases) for the
full history.
