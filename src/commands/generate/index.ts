import fs from 'fs';
import path from 'path';

import { Config } from '../../classes/Config';
import { FigmaAPI } from '../../classes/FigmaApi';
import { FileStorage } from '../../classes/FileStorage';
import { TokenManager } from '../../classes/TokenManager';
// import type { IFigmaTokenVariables, ResolvedTokenFile } from '../../classes/TokenManager/types';
import { colorsFromTokenManager } from '../../modules';

// Function to read manifests from mocks and write them to JSON files
const processMockManifests = async () => {
    const mocksDir = path.join(process.cwd(), 'mocks');
    const outputDir = path.join(process.cwd(), 'output');

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Read all subdirectories in mocks
    const mockDirs = fs
        .readdirSync(mocksDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

    console.log(`Found mock directories: ${mockDirs.join(', ')}`);

    // Process each mock directory
    for (const mockDir of mockDirs) {
        const mockPath = path.join(mocksDir, mockDir);
        const manifestPath = path.join(mockPath, 'manifest.json');

        if (fs.existsSync(manifestPath)) {
            try {
                console.log(`Processing manifest: ${mockDir}`);

                const tokenManager = new TokenManager(mockPath);
                await tokenManager.load();
                console.log(
                    "tokenManager.getVariableByPath('fontSize.body')"
                    // tokenManager.getVariableByPath('fontSize.body')
                );

                const result = {
                    variables: tokenManager.getVariables(),
                    styles: tokenManager.getStyles(),
                };

                // Write to JSON file
                const outputFile = path.join(outputDir, `${mockDir}.tokens.json`);
                fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));

                console.log(`✓ Written: ${outputFile}`);
            } catch (error) {
                console.error(`✗ Failed to process ${mockDir}:`, error);
            }
        } else {
            console.warn(`⚠ Manifest not found: ${manifestPath}`);
        }
    }
};

export const generate = async () => {
    // Process mock manifests and write to JSON files
    // await processMockManifests();

    const config = new Config();
    const configData = await config.load();
    if (!configData) {
        throw new Error('Заполнить ошибку через нейронку');
    }

    const { figmaToken, fileId, modules, manifest } = configData;

    const figmaApiClient = new FigmaAPI(figmaToken, fileId);

    const tokenManagerClient = new TokenManager(path.join(process.cwd(), 'mocks/mock2'));
    await tokenManagerClient.load();
    // if (manifest && FileStorage.exists(manifest)) {
    //     const tokenManager = new TokenManager(manifest);
    //     await tokenManager.load();
    //     tokens = {
    //         variables: tokenManager.getVariables(),
    //         styles: tokenManager.getStyles(),
    //     };
    // }

    await Promise.all(
        [
            colorsFromTokenManager({
                input: {
                    // includeVariables: ['colors'],
                    // includeStyles: false,
                },
                output: {
                    jsonDir: './fromVariables',
                    stylesDir: './fromVariables',
                },
            }),
        ].map(module => module.executor({ figmaApiClient, tokenManagerClient }))
    );
};
