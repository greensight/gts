import { FileStorage } from '../../classes/FileStorage';
import type { IBreakpointToken } from './types';

/**
 * Converts breakpoint token value to number
 */
export const parseBreakpointValue = (token: IBreakpointToken): number => {
    return parseInt(token.value, 10);
};

/**
 * Converts array of breakpoint tokens to object with numeric values
 */
export const tokensToNumericObject = (tokens: IBreakpointToken[]): Record<string, number> => {
    return tokens.reduce((acc, token) => ({
        ...acc,
        [token.name]: parseBreakpointValue(token)
    }), {});
};

/**
 * Common file operations for breakpoints modules
 */
export const deleteFile = async (fileName: string, directory: string): Promise<void> => {
    await FileStorage.delete(fileName, directory);
};

export const writeFile = async (fileName: string, content: string, directory: string): Promise<void> => {
    await FileStorage.write(fileName, content, { directory });
};

export const deleteAndWriteFile = async (
    fileName: string,
    content: string,
    directory: string
): Promise<void> => {
    await deleteFile(fileName, directory);
    await writeFile(fileName, content, directory);
};