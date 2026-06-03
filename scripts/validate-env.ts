#!/usr/bin/env node

import 'reflect-metadata';

import { config } from 'dotenv';

config({ quiet: true });

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateEnvironment } from '../src/config/env-validation.config';

/**
 * Environment variables validation script.
 * Run before build/deploy to ensure .env is correctly configured.
 *
 * Usage: yarn validate:env
 */

type ColorKey = 'red' | 'green' | 'yellow' | 'blue' | 'reset';

const colors: Record<ColorKey, string> = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

function log(message: string, color: ColorKey = 'reset'): void {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function run(): void {
  log('🔍 Validating environment variables...', 'blue');

  const envFile = resolve(process.cwd(), '.env');

  if (!existsSync(envFile)) {
    log('❌ .env file not found', 'red');
    log('💡 Copy the example file:', 'yellow');
    log('   cp .env.example .env', 'yellow');
    process.exit(1);
  }

  try {
    validateEnvironment(process.env as Record<string, unknown>);
    log('\n✅ All environment variables are valid!', 'green');
    process.exit(0);
  } catch (error) {
    log('\n❌ Validation failed:', 'red');
    log((error as Error).message, 'red');
    log('\n💡 Check .env and .env.example', 'yellow');
    process.exit(1);
  }
}

run();
