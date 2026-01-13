import path from 'path';
import { tsImport } from 'ts-import';

import type { IModule } from '../../modules/types';
import { FileStorage } from '../FileStorage';

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
            const exportedContent: { default: IGtsConfig } | undefined = await tsImport.compile(
                `${path.resolve(process.cwd(), Config.configFileName)}`
            );

            if (!exportedContent) throw new Error();
            return exportedContent.default;
        } catch (error) {
            console.error('Cannot find module gts.config.ts', error);
        }
    }
}
