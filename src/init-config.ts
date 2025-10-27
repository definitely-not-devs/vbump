#!/usr/bin/env node

import { writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import * as readline from 'readline';

const CONFIG_FILE = 'vbump.json';

interface VBumpConfig {
  branches: {
    source?: string;
    targets: string[];
  };
  commitMessageTemplate?: string;
  packageFile?: string;
  createTag?: boolean;
  tagPrefix?: string;
}

function question(rl: readline.Interface, query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

export async function initConfig(): Promise<void> {
  const configPath = join(process.cwd(), CONFIG_FILE);

  if (existsSync(configPath)) {
    console.log(`⚠️  Configuration file already exists: ${CONFIG_FILE}`);
    console.log('Delete the existing file if you want to reinitialize.');
    return;
  }

  console.log('🚀 Initializing vbump configuration...\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    // Source branch
    const sourceBranch = await question(
      rl,
      'Source branch (leave empty to use current branch when running): '
    );

    // Target branches
    const targetsInput = await question(
      rl,
      'Target branches (comma-separated, leave empty for none): '
    );

    // Commit message template
    const commitMessage = await question(
      rl,
      'Commit message template (use {version} as placeholder, default: chore(release): {version}): '
    );

    // Package file
    const packageFile = await question(
      rl,
      'Package file path (default: package.json): '
    );

    // Git tagging
    const createTag = await question(rl, 'Create git tags? (Y/n): ');

    const tagPrefix = await question(rl, 'Tag prefix (default: none): ');

    // Build config
    const config: VBumpConfig = {
      branches: {
        targets: targetsInput
          ? targetsInput.split(',').map((b) => b.trim())
          : [],
      },
    };

    if (sourceBranch.trim()) {
      config.branches.source = sourceBranch.trim();
    }

    if (commitMessage.trim()) {
      config.commitMessageTemplate = commitMessage.trim();
    }

    if (packageFile.trim() && packageFile.trim() !== 'package.json') {
      config.packageFile = packageFile.trim();
    }

    if (createTag.toLowerCase() === 'n') {
      config.createTag = false;
    }

    if (tagPrefix.trim()) {
      config.tagPrefix = tagPrefix.trim();
    }

    // Write config file
    await writeFile(configPath, JSON.stringify(config, null, 2) + '\n');

    console.log(`\n✅ Configuration file created: ${CONFIG_FILE}`);
    console.log('\nConfiguration:');
    console.log(JSON.stringify(config, null, 2));
    console.log('\nYou can now run: vbump --major | --minor | --patch');
  } catch (error) {
    console.error(
      '❌ Error creating config:',
      error instanceof Error ? error.message : error
    );
    throw error;
  } finally {
    rl.close();
  }
}

// Allow this file to be run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initConfig().catch((error) => {
    console.error('Failed to initialize config:', error);
    process.exit(1);
  });
}
