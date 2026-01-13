import { tsImport } from 'ts-import';

import { FileStorage } from '../FileStorage';
import type { IModule } from '../../modules/types';

export interface IGtsConfig {
    figmaToken: string;
    fileId: string;
    modules: IModule[];
}

export class Config {
    private static readonly configFileName = 'gts.config.ts';

    static async create() {
        if (FileStorage.exists(Config.configFileName)) {
            throw new Error('The file already exists');
        }

        await FileStorage.write(Config.configFileName, '', { overwrite: false });
    }

    public async load(): Promise<IGtsConfig | undefined> {
        try {
            const exportedContent = await tsImport.compile(Config.configFileName);

            if (!exportedContent) throw new Error();
            return exportedContent.default;
        } catch (error) {
            console.error('Cannot find module gts.config.ts', error);
        }
    }
}
