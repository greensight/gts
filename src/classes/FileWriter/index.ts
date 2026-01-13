import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

interface IWriteOptions {
    directory?: string;
    overwrite?: boolean;
}

export class FileWriter {
    constructor(private readonly baseDir: string = process.cwd()) {}

    private resolveTargetPath(fileName: string, directory?: string) {
        const targetDir = resolve(this.baseDir, directory ?? '');
        return {
            targetDir,
            targetPath: resolve(targetDir, fileName),
        };
    }

    async write(fileName: string, content = '', options: IWriteOptions = {}) {
        const { directory, overwrite = true } = options;
        const { targetDir, targetPath } = this.resolveTargetPath(fileName, directory);

        if (!overwrite && existsSync(targetPath)) {
            throw new Error(`File ${targetPath} already exists`);
        }

        await mkdir(targetDir, { recursive: true });
        await writeFile(targetPath, content, { encoding: 'utf8' });

        return targetPath;
    }

    async writeWithExtension(name: string, extension: string, content = '', options?: IWriteOptions) {
        const normalizedExtension = extension.startsWith('.') ? extension : `.${extension}`;
        const fileName = `${name}${normalizedExtension}`;

        return this.write(fileName, content, options);
    }
}
