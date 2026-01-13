import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export class FileReader {
    constructor(private readonly baseDir: string = process.cwd()) {}

    private resolveTargetPath(filePath: string) {
        if (!filePath || !filePath.trim()) {
            throw new Error('File path must be a non-empty string');
        }

        return resolve(this.baseDir, filePath);
    }

    private handleReadError(error: unknown, targetPath: string): never {

        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            throw new Error(`File not found: ${targetPath}`);
        }

        throw new Error(`Failed to read file "${targetPath}": ${(error as NodeJS.ErrnoException).message ?? String(error)}`);
    }

    async read(filePath: string, encoding: BufferEncoding = 'utf8') {
        const targetPath = this.resolveTargetPath(filePath);

        try {
            return await readFile(targetPath, { encoding });
        } catch (error) {
            this.handleReadError(error, targetPath);
        }
    }

    async readBuffer(filePath: string) {
        const targetPath = this.resolveTargetPath(filePath);

        try {
            return await readFile(targetPath);
        } catch (error) {
            this.handleReadError(error, targetPath);
        }
    }

    async readJson<T = unknown>(filePath: string): Promise<T> {
        const targetPath = this.resolveTargetPath(filePath);

        try {
            const content = await readFile(targetPath, { encoding: 'utf8' });

            try {
                return JSON.parse(content) as T;
            } catch (parseError) {
                throw new Error(`Failed to parse JSON from "${targetPath}": ${(parseError as Error).message}`);
            }
        } catch (error) {
            this.handleReadError(error, targetPath);
        }
    }
}
