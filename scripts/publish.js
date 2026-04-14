#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

try {
    const packageJsonPath = resolve(process.cwd(), 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

    const currentVersion = packageJson.version;
    const versionMatch = currentVersion.match(/^(\d+)\.(\d+)\.(\d+)(?:-(alpha|beta|rc)\.(\d+))?$/);

    if (!versionMatch) {
        console.error(`❌ Invalid version format: ${currentVersion}`);
        console.error('Expected format: X.Y.Z or X.Y.Z-<preid>.N (preid: alpha, beta, rc)');
        process.exit(1);
    }

    const [, major, minor, patch, preRelease, preReleaseNumber] = versionMatch;

    let newVersion;
    if (preRelease === 'beta') {
        const newPreReleaseNumber = parseInt(preReleaseNumber || '0', 10) + 1;
        newVersion = `${major}.${minor}.${patch}-beta.${newPreReleaseNumber}`;
    } else {
        newVersion = `${major}.${minor}.${patch}-beta.1`;
    }

    packageJson.version = newVersion;
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 4) + '\n');

    console.log(`📦 Version updated: ${currentVersion} -> ${newVersion}`);

    console.log('🔨 Building project...');
    try {
        execSync('pnpm run build', { stdio: 'inherit' });
    } catch (error) {
        console.error('❌ Build failed:', error.message);
        process.exit(1);
    }

    console.log(`📤 Publishing ${newVersion} to npm with tag "beta"...`);
    try {
        execSync(`cd dist && npm publish --access public --tag beta`, { stdio: 'inherit' });
        console.log(`✅ Successfully published ${newVersion}`);
    } catch (error) {
        console.error(`❌ Failed to publish ${newVersion}:`, error.message);
        console.error('Make sure you are logged in to npm: npm login');
        console.error('Check npm permissions for package:', packageJson.name);
        process.exit(1);
    }
} catch (error) {
    console.error('❌ Unexpected error:', error.message);
    if (error.stack) {
        console.error(error.stack);
    }
    process.exit(1);
}
