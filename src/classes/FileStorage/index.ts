import { existsSync } from 'node:fs';
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

interface IWriteOptions {
    directory?: string;
    overwrite?: boolean;
}

export class FileStorage {
    private static readonly baseDir: string = process.cwd();

    private static resolveReadPath(filePath: string) {
        if (!filePath || !filePath.trim()) {
            throw new Error('File path must be a non-empty string');
        }

        return resolve(FileStorage.baseDir, filePath);
    }

    private static resolveWritePath(fileName: string, directory?: string) {
        const targetDir = resolve(FileStorage.baseDir, directory ?? '');
        return {
            targetDir,
            targetPath: resolve(targetDir, fileName),
        };
    }

    private static handleReadError(error: unknown, targetPath: string): never {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            throw new Error(`File not found: ${targetPath}`);
        }

        throw new Error(
            `Failed to read file "${targetPath}": ${(error as NodeJS.ErrnoException).message ?? String(error)}`
        );
    }

    static async read(filePath: string, encoding: BufferEncoding = 'utf8') {
        const targetPath = FileStorage.resolveReadPath(filePath);

        try {
            return await readFile(targetPath, { encoding });
        } catch (error) {
            FileStorage.handleReadError(error, targetPath);
        }
    }

    static async readBuffer(filePath: string) {
        const targetPath = FileStorage.resolveReadPath(filePath);

        try {
            return await readFile(targetPath);
        } catch (error) {
            FileStorage.handleReadError(error, targetPath);
        }
    }

    static async readJson<T = unknown>(filePath: string): Promise<T> {
        const targetPath = FileStorage.resolveReadPath(filePath);

        try {
            const content = await readFile(targetPath, { encoding: 'utf8' });

            try {
                return JSON.parse(content) as T;
            } catch (parseError) {
                throw new Error(`Failed to parse JSON from "${targetPath}": ${(parseError as Error).message}`);
            }
        } catch (error) {
            FileStorage.handleReadError(error, targetPath);
        }
    }

    static async write(fileName: string, content = '', options: IWriteOptions = {}) {
        const { directory, overwrite = true } = options;
        const { targetDir, targetPath } = FileStorage.resolveWritePath(fileName, directory);

        if (!overwrite && existsSync(targetPath)) {
            throw new Error(`File ${targetPath} already exists`);
        }

        await mkdir(targetDir, { recursive: true });
        await writeFile(targetPath, content, { encoding: 'utf8' });

        return targetPath;
    }

    static async writeWithExtension(name: string, extension: string, content = '', options?: IWriteOptions) {
        const normalizedExtension = extension.startsWith('.') ? extension : `.${extension}`;
        const fileName = `${name}${normalizedExtension}`;

        return FileStorage.write(fileName, content, options);
    }

    static exists(filePath: string): boolean {
        const targetPath = FileStorage.resolveReadPath(filePath);
        return existsSync(targetPath);
    }

    static async delete(fileName: string, directory?: string) {
        const { targetPath } = FileStorage.resolveWritePath(fileName, directory);

        if (!existsSync(targetPath)) {
            return;
        }

        await rm(targetPath, { force: true });
    }
}
