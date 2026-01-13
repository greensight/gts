import { Config } from '../../classes/Config';
import { FigmaAPI } from '../../classes/FigmaApi';
import { colorsFromStyles } from '../../modules/colors/colorsFromStyles';

export const generate = async () =>
    // moduleNames?: string[]
    {
        const config = new Config();
        const configData = await config.load();
        if (!configData) {
            throw new Error('Заполнить ошибку через нейронку');
        }

        const { figmaToken, fileId, modules } = configData;

        const figmaApiClient = new FigmaAPI(figmaToken, fileId);

        await Promise.all(
            [colorsFromStyles({ variablePaths: ['./dark.tokens.json', './light.tokens.json'] })].map(module =>
                module.executor({ figmaApiClient })
            )
        );
    };
