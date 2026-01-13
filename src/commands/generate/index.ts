import { Config } from '../../classes/Config';
import { FigmaAPI } from '../../classes/FigmaApi';

export const generate = async () => {
    const config = new Config();
    const configData = await config.load();
    if (!configData) {
        throw new Error('Заполнить ошибку через нейронку');
    }

    const { figmaToken, fileId, modules } = configData;

    const figmaApiClient = new FigmaAPI(figmaToken, fileId);

    await Promise.all(
        // [
        //     colorsFromStyles({
        //         input: { variablePaths: ['./dark.tokens.json', './light.tokens.json'] },
        //         output: { jsonDir: './fromStyles', stylesDir: './fromStyles' },
        //     }),
        //     colorsFromVariables({
        //         input: { variablePaths: ['./dark.tokens.json', './light.tokens.json'] },
        //         output: { jsonDir: './fromVariables', stylesDir: './fromVariables' },
        //     }),
        // ]

        modules.map(module => module.executor({ figmaApiClient }))
    );
};
