# vbump

Automated version bumping tool with git workflow support. Built with TypeScript and inspired by notegen's architecture.

## Features

- 🚀 Semantic version bumping (major, minor, patch)
- 🔀 Automated git workflow with branch switching and merging
- 📝 Customizable commit messages
- ⚙️ Configuration file support
- 🔍 Dry run mode to preview changes
- 📦 Works with any package.json based project
- ✨ Type-safe with TypeScript
- 🎯 Multiple target branches support

## Installation

```bash
npm install -g @definitely-not-devs/vbump
# or
pnpm add -g @definitely-not-devs/vbump
# or
yarn global add @definitely-not-devs/vbump
```

## Quick Start

### 1. Initialize Configuration

```bash
vbump init
```

This creates a `vbump.json` configuration file with interactive prompts.

### 2. Bump Version

```bash
# Bump patch version (1.0.0 -> 1.0.1)
vbump --patch

# Bump minor version (1.0.0 -> 1.1.0)
vbump --minor

# Bump major version (1.0.0 -> 2.0.0)
vbump --major
```

### 3. Check Current Version

```bash
vbump current
# Output: 📦 Current version: 1.2.3
```

## Configuration

Create a `vbump.json` file in your project root:

```json
{
  "branches": {
    "source": "develop",
    "targets": ["UAT", "staging"]
  },
  "commitMessageTemplate": "build: {version}",
  "packageFile": "package.json",
  "createTag": true,
  "tagPrefix": "v"
}
```

### Configuration Options

| Option                  | Type       | Default              | Description                                              |
| ----------------------- | ---------- | -------------------- | -------------------------------------------------------- |
| `branches.source`       | `string`   | `"develop"`          | Source branch where version bump occurs                  |
| `branches.targets`      | `string[]` | `["UAT"]`            | Target branches to merge changes into                    |
| `commitMessageTemplate` | `string`   | `"build: {version}"` | Commit message template (use `{version}` as placeholder) |
| `packageFile`           | `string`   | `"package.json"`     | Path to package file                                     |
| `createTag`             | `boolean`  | `true`               | Create git tag for the version                           |
| `tagPrefix`             | `string`   | `"v"`                | Prefix for git tags (e.g., "v" creates "v1.2.3")         |

## CLI Commands

### `vbump [options]`

Bump version and execute git workflow.

**Bump Type Options (required, choose one):**

- `-M, --major` - Bump major version (x.0.0)
- `-m, --minor` - Bump minor version (0.x.0)
- `-p, --patch` - Bump patch version (0.0.x)

**Additional Options:**

- `--message <message>` - Custom commit message
- `-s, --source <branch>` - Source branch (overrides config)
- `-t, --targets <branches>` - Target branches, comma-separated (overrides config)
- `--skip-push` - Skip pushing changes to remote
- `--skip-merge` - Skip merging to target branches
- `-f, --file <path>` - Package file path (default: package.json)
- `--dry-run` - Preview changes without executing
- `--tag` - Create git tag (enabled by default)
- `--no-tag` - Skip creating git tag
- `--tag-prefix <prefix>` - Tag prefix (default: v)

**Examples:**

```bash
# Basic usage
vbump --patch
vbump -p

# With custom commit message
vbump --minor --message "chore: release v1.1.0"

# Dry run to preview changes
vbump --major --dry-run

# Custom branches
vbump --patch -s main -t "production,staging"

# Skip pushing to remote
vbump --patch --skip-push

# Skip merging to target branches
vbump -p --skip-merge

# Skip creating git tag
vbump --patch --no-tag

# Custom tag prefix
vbump --minor --tag-prefix "release-"
```

### `vbump current`

Display the current version from package.json.

**Options:**

- `-f, --file <path>` - Package file path (default: package.json)

**Aliases:** `vbump c`

### `vbump init`

Initialize configuration file with interactive prompts.

## Git Workflow

When you run `vbump` with a bump type flag, the following workflow is executed:

1. ✅ **Fetch** - Fetch latest changes from remote
2. 🔀 **Switch** - Switch to source branch (e.g., `develop`)
3. ⬇️ **Pull** - Pull latest changes on source branch
4. 📝 **Update** - Update version in package.json
5. 💾 **Commit** - Commit changes with message
6. 🏷️ **Tag** - Create git tag (unless `--no-tag`)
7. ⬆️ **Push** - Push to source branch and tags (unless `--skip-push`)
8. 🔄 **Merge** - For each target branch:
   - Switch to target branch
   - Pull latest changes
   - Merge source branch
   - Push to target branch
9. 🔙 **Return** - Switch back to source branch

## Comparison to bump.mjs

vbump is inspired by the simple `bump.mjs` script but offers:

| Feature                  | bump.mjs | vbump                        |
| ------------------------ | -------- | ---------------------------- |
| TypeScript               | ❌       | ✅                           |
| Type Safety              | ❌       | ✅                           |
| CLI Framework            | ❌       | ✅ Commander                 |
| Config File              | ❌       | ✅ vbump.json                |
| Dry Run Mode             | ❌       | ✅                           |
| Customizable Branches    | ❌       | ✅                           |
| Skip Options             | ❌       | ✅ --skip-push, --skip-merge |
| Multiple Target Branches | Limited  | ✅                           |
| Error Handling           | Basic    | ✅ Comprehensive             |
| npm Package              | ❌       | ✅                           |

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm run build

# Development mode (watch)
pnpm run dev

# Type check
pnpm run typecheck

# Lint
pnpm run lint

# Format
pnpm run format
```

## Use Cases

### Single Branch Workflow

```json
{
  "branches": {
    "source": "main"
  }
}
```

```bash
vbump --patch --skip-merge
```

### Multi-Environment Workflow

```json
{
  "branches": {
    "source": "develop",
    "targets": ["staging", "UAT", "production"]
  }
}
```

```bash
vbump --minor
```

### Custom Commit Messages

```json
{
  "commitMessageTemplate": "chore(release): bump to {version}"
}
```

## License

MIT

## Author

Part of the @definitely-not-devs suite of tools, including:

- [notegen](https://github.com/definitely-not-devs/notegen) - Release notes generator
- vbump - Version bumping tool
