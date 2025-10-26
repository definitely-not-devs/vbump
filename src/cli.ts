#!/usr/bin/env node

import { Command } from 'commander';
import { bumpVersion, getCurrentVersion, BumpType } from './index.js';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

interface VBumpConfig {
  branches?: {
    source?: string;
    targets?: string[];
  };
  commitMessageTemplate?: string;
  packageFile?: string;
  createTag?: boolean;
  tagPrefix?: string;
}

const CONFIG_FILE = 'vbump.json';

// Get package.json path relative to this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJsonPath = join(__dirname, '../package.json');
const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));

async function loadConfig(): Promise<VBumpConfig> {
  const configPath = join(process.cwd(), CONFIG_FILE);

  if (!existsSync(configPath)) {
    return {};
  }

  try {
    const content = await readFile(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.warn(
      `⚠️  Failed to load config file: ${error instanceof Error ? error.message : error}`
    );
    return {};
  }
}

const program = new Command();

program
  .name('vbump')
  .description('Automated version bumping tool with git workflow support')
  .version(packageJson.version);

program
  .description('Bump version and execute git workflow')
  .option('-M, --major', 'Bump major version (x.0.0)')
  .option('-m, --minor', 'Bump minor version (0.x.0)')
  .option('-p, --patch', 'Bump patch version (0.0.x)')
  .option('--message <message>', 'Custom commit message')
  .option('-s, --source <branch>', 'Source branch (default: develop)')
  .option('-t, --targets <branches>', 'Target branches (comma-separated)')
  .option('--skip-push', 'Skip pushing changes to remote')
  .option('--skip-merge', 'Skip merging to target branches')
  .option('-f, --file <path>', 'Package file path (default: package.json)')
  .option('--dry-run', 'Preview changes without executing')
  .option('--tag', 'Create git tag (enabled by default)')
  .option('--no-tag', 'Skip creating git tag')
  .option('--tag-prefix <prefix>', 'Tag prefix (default: v)')
  .action(async (options) => {
    try {
      // Determine bump type from flags
      let bumpType: BumpType | null = null;
      if (options.major) bumpType = 'major';
      else if (options.minor) bumpType = 'minor';
      else if (options.patch) bumpType = 'patch';

      if (!bumpType) {
        console.error(
          '❌ Please specify a bump type: --major, --minor, or --patch'
        );
        process.exit(1);
      }

      // Load config file
      const config = await loadConfig();

      // Parse target branches
      let targets = config.branches?.targets;
      if (options.targets) {
        targets = options.targets.split(',').map((b: string) => b.trim());
      }

      // Merge config with CLI options (CLI options take precedence)
      const bumpOptions = {
        bumpType,
        branches: {
          source: options.source || config.branches?.source || 'develop',
          targets: targets || ['UAT'],
        },
        commitMessage:
          options.message ||
          (config.commitMessageTemplate
            ? config.commitMessageTemplate.replace(
                '{version}',
                await getCurrentVersion(
                  options.file || config.packageFile || 'package.json'
                )
              )
            : undefined),
        skipPush: options.skipPush || false,
        skipMerge: options.skipMerge || false,
        packageFile: options.file || config.packageFile || 'package.json',
        dryRun: options.dryRun || false,
        createTag:
          options.tag !== undefined ? options.tag : (config.createTag ?? true),
        tagPrefix: options.tagPrefix || config.tagPrefix || 'v',
      };

      const result = await bumpVersion(bumpOptions);

      if (!options.dryRun) {
        console.log(
          `\n🎉 Version successfully bumped from ${result.oldVersion} to ${result.newVersion}`
        );
      }
    } catch (error) {
      console.error(
        '❌ Error:',
        error instanceof Error ? error.message : error
      );
      process.exit(1);
    }
  });

program
  .command('current')
  .alias('c')
  .description('Show current version')
  .option('-f, --file <path>', 'Package file path (default: package.json)')
  .action(async (options) => {
    try {
      const config = await loadConfig();
      const packageFile = options.file || config.packageFile || 'package.json';
      const version = await getCurrentVersion(packageFile);
      console.log(`📦 Current version: ${version}`);
    } catch (error) {
      console.error(
        '❌ Error:',
        error instanceof Error ? error.message : error
      );
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize configuration file')
  .action(async () => {
    const { initConfig } = await import('./init-config.js');
    await initConfig();
  });

program.parse();
