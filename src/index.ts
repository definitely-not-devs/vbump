import { execFile } from 'child_process';
import { promisify } from 'util';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const execFileAsync = promisify(execFile);

export type BumpType = 'major' | 'minor' | 'patch';

export interface BumpOptions {
  bumpType: BumpType;
  branches?: {
    source?: string;
    targets?: string[];
  };
  commitMessage?: string;
  skipPush?: boolean;
  skipMerge?: boolean;
  packageFile?: string;
  dryRun?: boolean;
  createTag?: boolean;
  tagPrefix?: string;
}

export interface VersionInfo {
  oldVersion: string;
  newVersion: string;
}

/**
 * Calculate the new version based on the bump type
 */
export function calculateNewVersion(
  currentVersion: string,
  bumpType: BumpType
): string {
  const parts = currentVersion.split('.').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(
      `Invalid version format: ${currentVersion}. Expected semantic version (e.g., 1.2.3)`
    );
  }

  const [major, minor, patch] = parts;

  switch (bumpType) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    default:
      throw new Error(
        `Invalid bump type: ${bumpType}. Use "major", "minor", or "patch".`
      );
  }
}

/**
 * Read the current version from package.json
 */
export async function getCurrentVersion(
  packageFile: string = 'package.json'
): Promise<string> {
  const packagePath = join(process.cwd(), packageFile);

  if (!existsSync(packagePath)) {
    throw new Error(`Package file not found: ${packagePath}`);
  }

  const content = await readFile(packagePath, 'utf-8');
  const packageJson = JSON.parse(content);

  if (!packageJson.version) {
    throw new Error('No version field found in package.json');
  }

  return packageJson.version;
}

/**
 * Update the version in package.json
 */
export async function updatePackageVersion(
  newVersion: string,
  packageFile: string = 'package.json'
): Promise<void> {
  const packagePath = join(process.cwd(), packageFile);
  const content = await readFile(packagePath, 'utf-8');
  const packageJson = JSON.parse(content);

  packageJson.version = newVersion;

  await writeFile(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
}

/**
 * Execute a git command
 */
async function execGit(args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync('git', args);
    return stdout.trim();
  } catch (error) {
    throw new Error(
      `Git command failed: git ${args.join(' ')}\n${error instanceof Error ? error.message : error}`
    );
  }
}

/**
 * Check if we're in a git repository
 */
export async function isGitRepository(): Promise<boolean> {
  try {
    await execGit(['rev-parse', '--git-dir']);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the current git branch
 */
export async function getCurrentBranch(): Promise<string> {
  return execGit(['branch', '--show-current']);
}

/**
 * Main version bump function
 */
export async function bumpVersion(options: BumpOptions): Promise<VersionInfo> {
  const {
    bumpType,
    branches = { source: 'develop', targets: ['UAT'] },
    commitMessage,
    skipPush = false,
    skipMerge = false,
    packageFile = 'package.json',
    dryRun = false,
    createTag = true,
    tagPrefix = 'v',
  } = options;

  // Check if we're in a git repository
  if (!(await isGitRepository())) {
    throw new Error('Not a git repository');
  }

  // Get current version
  const currentVersion = await getCurrentVersion(packageFile);

  // Calculate new version
  const newVersion = calculateNewVersion(currentVersion, bumpType);

  if (dryRun) {
    console.log(`🔍 Dry run mode enabled`);
    console.log(`📦 Current version: ${currentVersion}`);
    console.log(`📦 New version: ${newVersion}`);
    console.log(`🔀 Source branch: ${branches.source}`);
    console.log(`🎯 Target branches: ${branches.targets?.join(', ') || 'none'}`);
    console.log(`🏷️  Create tag: ${createTag ? `${tagPrefix}${newVersion}` : 'no'}`);
    return { oldVersion: currentVersion, newVersion };
  }

  // Fetch latest changes
  console.log('🔄 Fetching latest changes...');
  await execGit(['fetch']);

  // Switch to source branch and pull
  const sourceBranch = branches.source || 'develop';
  console.log(`🔀 Switching to ${sourceBranch}...`);
  await execGit(['switch', sourceBranch]);
  await execGit(['pull']);

  // Update package.json
  console.log(`📝 Updating version: ${currentVersion} → ${newVersion}`);
  await updatePackageVersion(newVersion, packageFile);

  // Commit changes
  const message = commitMessage || `build: ${newVersion}`;
  console.log(`💾 Committing changes: ${message}`);
  await execGit(['add', packageFile]);
  await execGit(['commit', '-m', message]);

  // Create git tag
  if (createTag) {
    const tagName = `${tagPrefix}${newVersion}`;
    console.log(`🏷️  Creating tag: ${tagName}`);
    await execGit(['tag', tagName]);
  }

  // Push to source branch
  if (!skipPush) {
    console.log(`⬆️  Pushing to ${sourceBranch}...`);
    await execGit(['push', 'origin', sourceBranch]);
    
    // Push tags
    if (createTag) {
      console.log(`⬆️  Pushing tags...`);
      await execGit(['push', 'origin', '--tags']);
    }
  }

  // Merge to target branches
  if (!skipMerge && branches.targets && branches.targets.length > 0) {
    for (const targetBranch of branches.targets) {
      console.log(`🔀 Switching to ${targetBranch}...`);
      await execGit(['switch', targetBranch]);
      await execGit(['pull']);

      console.log(`🔄 Merging ${sourceBranch} into ${targetBranch}...`);
      await execGit(['pull', 'origin', sourceBranch]);

      if (!skipPush) {
        console.log(`⬆️  Pushing to ${targetBranch}...`);
        await execGit(['push', 'origin', targetBranch]);
      }
    }

    // Switch back to source branch
    console.log(`🔙 Switching back to ${sourceBranch}...`);
    await execGit(['switch', sourceBranch]);
  }

  console.log(`✅ Version bumped successfully: ${newVersion}`);

  return { oldVersion: currentVersion, newVersion };
}
