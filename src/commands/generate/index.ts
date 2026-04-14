import { Config } from '../../classes/Config';
import { FigmaAPI } from '../../classes/FigmaApi';
import { FileStorage } from '../../classes/FileStorage';
import { TokenManager } from '../../classes/TokenManager';

export const generate = async () => {
    const config = new Config();
    const configData = await config.load();
    if (!configData) {
        throw new Error(
            'Failed to load gts.config.ts. Run "npx gts-init" to create it, or ensure the file exists and default-exports a valid configuration.'
        );
    }

    const { figmaToken, fileId, modules, manifest } = configData;

    const figmaApiClient = new FigmaAPI(figmaToken, fileId);

    const tokenManagerClient = new TokenManager(manifest);
    if (manifest && FileStorage.exists(manifest)) {
        await tokenManagerClient.load();
    }
    await Promise.all(modules.map(module => module.executor({ figmaApiClient, tokenManagerClient })));
};
