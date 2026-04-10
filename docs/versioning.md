# Versioning Strategy

This project follows **Semantic Versioning (SemVer)** — `MAJOR.MINOR.PATCH` — as defined at <https://semver.org>.

## Version Format

```
MAJOR.MINOR.PATCH
```

| Segment | When it changes |
|---------|----------------|
| **MAJOR** | Backwards-incompatible (breaking) changes |
| **MINOR** | New, backwards-compatible features |
| **PATCH** | Backwards-compatible bug fixes and small improvements |

## Conventional Commits

Commit messages follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.  
The release pipeline reads the latest commit message and automatically determines the version bump.

### Commit Message Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Type → Bump Mapping

| Commit prefix | Example | Bump |
|---------------|---------|------|
| `fix:` | `fix: handle null JWT token` | **patch** |
| `perf:` | `perf: optimize cache lookup` | **patch** |
| `refactor:` | `refactor: extract query builder` | **patch** |
| `feat:` | `feat: add user-search endpoint` | **minor** |
| `feat!:` or `BREAKING CHANGE:` | `feat!: drop Node 16 support` | **major** |
| `docs:`, `chore:`, `ci:`, `test:`, `style:` | `chore: update deps` | _(no release)_ |

> **Note:** Only commits with a releasable prefix (`fix`, `perf`, `refactor`, `feat`, or a breaking change marker) trigger an automated release.
> Non-releasable commits (e.g. `docs:`, `chore:`, `ci:`) are merged to `main` without cutting a new version.

### Breaking Changes

A breaking change can be indicated in two ways:

1. **Exclamation mark** after the type:
   ```
   feat!: remove deprecated v1 API
   ```

2. **`BREAKING CHANGE:` footer** in the commit body:
   ```
   refactor: replace Axios with fetch

   BREAKING CHANGE: The `httpClient` config key is removed; use `fetchOptions` instead.
   ```

Both forms trigger a **major** version bump.

## Release Workflow

The automated release is implemented in [`.github/workflows/release.yml`](../.github/workflows/release.yml).

### Automatic releases (push to `main`)

Every push to `main` runs the release workflow.  
The workflow analyses the latest commit message:

```
push to main
     │
     ▼
Detect bump type from commit message
     │
     ├─ No releasable prefix → exit (no release)
     │
     ├─ fix / perf / refactor → patch
     ├─ feat                  → minor
     └─ BREAKING CHANGE / !   → major
              │
              ▼
        Calculate new version
        (read package.json → increment)
              │
              ▼
        Update package.json
        Commit "[skip ci]"
        Create annotated git tag
        Push tag to main
              │
              ▼
        Create GitHub Release
        (with auto-generated release notes)
```

### Manual releases (`workflow_dispatch`)

You can also trigger a release manually from the **Actions** tab:

1. Go to **Actions → Release**.
2. Click **Run workflow**.
3. Choose a `bump_type`:
   - `auto` — let the workflow detect from the latest commit (same as automatic)
   - `patch` — force a patch bump
   - `minor` — force a minor bump
   - `major` — force a major bump
4. Click **Run workflow**.

Use the manual trigger when:
- Multiple fix commits were squash-merged and a single patch release is desired.
- A minor or major bump needs to be forced (e.g. after a large batch of `chore:` commits that still represent a meaningful release).

## Initial Version

The project starts at **`0.0.1`**.  
Version `0.x.y` means the public API is not yet stable.  
Once the API is considered stable, the version will be bumped to `1.0.0` with a **major** release.

## Changelog

GitHub automatically generates release notes from pull-request titles and commit
messages when a release is created.  See the
[Releases page](https://github.com/stritti/nocodb-middleware/releases) for the
full history.
