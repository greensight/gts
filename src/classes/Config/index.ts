import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { tsImport } from 'ts-import';

import type { IModule } from '../../modules/types';

export interface IGtsConfig {
    figmaToken: string;
    fileId: string;
    modules: IModule[];
}

export class Config {
    static async create() {
        const path = './gts.config.ts';

        if (existsSync(path)) {
            throw new Error('The file already exists');
        }

        await writeFile(path, '');
    }

    public async load(): Promise<IGtsConfig | undefined> {
        const path = resolve(process.cwd(), './gts.config.ts');
        try {
            const exportedContent = await tsImport.compile(path);

            if (!exportedContent) throw new Error();
            return exportedContent.default;
        } catch (error) {
            console.error('Cannot find module gts.config.ts', error);
        }
    }
}
