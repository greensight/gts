#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

const packageJsonPath = resolve(process.cwd(), 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

const currentVersion = packageJson.version;
const versionMatch = currentVersion.match(/^(\d+)\.(\d+)\.(\d+)(?:-(alpha|beta|rc)\.(\d+))?$/);

if (!versionMatch) {
    console.error(`Invalid version format: ${currentVersion}`);
    process.exit(1);
}

const [, major, minor, patch, preRelease, preReleaseNumber] = versionMatch;

let newVersion;
if (preRelease === 'alpha') {
    // Увеличиваем альфа версию: 1.0.0-alpha.1 -> 1.0.0-alpha.2
    const newPreReleaseNumber = parseInt(preReleaseNumber || '0', 10) + 1;
    newVersion = `${major}.${minor}.${patch}-alpha.${newPreReleaseNumber}`;
} else {
    // Если нет пре-релиза, создаем первую альфа версию
    newVersion = `${major}.${minor}.${patch}-alpha.1`;
}

packageJson.version = newVersion;
writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 4) + '\n');

console.log(`Version updated: ${currentVersion} -> ${newVersion}`);

console.log('Building project...');
execSync('pnpm run build', { stdio: 'inherit' });

console.log(`Publishing ${newVersion} to npm with tag "alpha"...`);
execSync(`cd dist && npm publish --tag alpha`, { stdio: 'inherit' });

console.log(`✅ Successfully published ${newVersion}`);
