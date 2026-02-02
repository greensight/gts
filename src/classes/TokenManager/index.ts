import path from 'path';

import { get, merge } from '../../common/lodash';
import { FileStorage } from '../FileStorage';
import type {
    ICollections,
    IDSStyles,
    IDSTokenVariable,
    IDSTokens,
    IFigmaStyles,
    IManifest,
    ITokenFile,
} from './types';

interface ICollectionIntermediateData {
    fileName: string;
    modeName: string;
    collectionName: string;
}

interface IStyleIntermediateData {
    styleType: keyof IFigmaStyles;
    fileName: string;
}

export class TokenManager {
    // files
    private tokensDir: string;
    private manifestPath: string;

    // result data
    private variables?: IDSTokens;
    private styles?: IDSStyles;

    // flags
    private loaded = false;

    constructor(tokensDir?: string) {
        this.tokensDir = tokensDir || '';
        this.manifestPath = path.join(this.tokensDir, 'manifest.json');
    }

    public isLoaded(): boolean {
        return this.loaded && !!this.variables && !!this.styles;
    }

    /** to camelCase */
    private normalizeKey(key: string): string {
        const str = key.trim();

        if (!str) return str;

        return str
            .replace(/[-_\s]+/g, ' ')
            .split(' ')
            .filter(word => word.length)
            .map((word, index) => {
                const firstChar = word.charAt(0);
                const restOfWord = word.slice(1);

                return index === 0 ? word.toLowerCase() : firstChar.toUpperCase() + restOfWord;
            })
            .join('');
    }

    /**
     * Parses variable string references like "{Line heights.h1}" and normalizes the content
     */
    private parseVariableString(value: string): string {
        if (typeof value !== 'string') return value;

        const variableRefPattern = /^\{(.+)\}$/;
        const match = value.match(variableRefPattern);

        if (match) {
            const variablePath = match[1].trim();
            const normalizedPath = this.normalizeKey(variablePath);
            return `{${normalizedPath}}`;
        }

        return value;
    }

    /**
     * Creates a flat list of variable files to process from manifest collections
     */
    private createVariableFileList(collections: ICollections): ICollectionIntermediateData[] {
        return Object.entries(collections).flatMap(([collectionName, collection]) =>
            Object.entries(collection.modes).flatMap(([modeName, fileNames]) =>
                fileNames.map(fileName => ({
                    fileName,
                    modeName: this.normalizeKey(modeName.trim()),
                    collectionName,
                }))
            )
        );
    }

    private parseValue(value: unknown): unknown {
        if (!value) return value;
        if (typeof value === 'string') return this.parseVariableString(value);
        if (typeof value !== 'object') return value;
        if (Array.isArray(value)) return value.map(v => this.parseValue(v));
        return Object.entries(value).reduce((acc, [k, v]) => ({ ...acc, [k]: this.parseValue(v) }), {});
    }

    private getTokensFromFile(tokens: ITokenFile, mode: string): IDSTokens {
        return Object.entries(tokens).reduce((acc, [tokenKey, tokenValue]) => {
            if ('$type' in tokenValue && '$value' in tokenValue) {
                return {
                    ...acc,
                    [this.normalizeKey(tokenKey)]: {
                        type: tokenValue.$type,
                        description: tokenValue.$description,
                        value: mode
                            ? { [this.normalizeKey(mode)]: this.parseValue(tokenValue.$value) }
                            : this.parseValue(tokenValue.$value),
                    },
                };
            }
            return { ...acc, [this.normalizeKey(tokenKey)]: this.getTokensFromFile(tokenValue, mode) };
        }, {});
    }

    private processTokensFile(tokens: ITokenFile, modeName: string, collectionName: string): IDSTokens {
        const normalizedCollectionName = this.normalizeKey(collectionName);

        const variableFileValue = this.getTokensFromFile(tokens, modeName);

        return { [normalizedCollectionName]: variableFileValue };
    }

    /**
     * Loads all variable files in parallel and returns processed results
     */
    private async loadVariableFiles(variableFiles: ICollectionIntermediateData[]): Promise<Array<IDSTokens>> {
        return Promise.all(
            variableFiles.map(async ({ fileName, modeName, collectionName }) => {
                try {
                    const filePath = path.join(this.tokensDir, fileName);
                    const tokens = await FileStorage.readJson<ITokenFile>(filePath);
                    return this.processTokensFile(tokens, modeName, collectionName);
                } catch (error) {
                    console.warn(`Failed to load variable file: ${path.join(this.tokensDir, fileName)}`, error);
                    return {} as IDSTokens;
                }
            })
        );
    }

    private mergeVariables(variables: IDSTokens[]): IDSTokens {
        return variables.reduce<IDSTokens>((acc, variableObj) => merge(acc, variableObj), {});
    }

    /**
     * Loads and processes all token variables from manifest collections
     */
    private async loadTokenVariables(collections: ICollections): Promise<IDSTokens> {
        try {
            const variableFileList = this.createVariableFileList(collections);
            const loadedVariables = await this.loadVariableFiles(variableFileList);
            const mergedVariables = this.mergeVariables(loadedVariables);

            return mergedVariables;
        } catch (error) {
            throw new Error(`Failed to load token variables from ${this.tokensDir}: ${error}`);
        }
    }

    /**
     * Creates a flat list of style files to process from manifest styles
     */
    private createStyleFileList(styles: IFigmaStyles): IStyleIntermediateData[] {
        return Object.entries(styles).flatMap(
            ([styleType, fileNames]) =>
                fileNames?.map((fileName: string) => ({
                    styleType,
                    fileName,
                })) || []
        );
    }

    /**
     * Loads all style files in parallel and returns results
     */
    private async loadStyleFiles(styleFiles: IStyleIntermediateData[]): Promise<IDSStyles> {
        const styles = await Promise.all(
            styleFiles.map(async ({ styleType, fileName }) => {
                try {
                    const filePath = path.join(this.tokensDir, fileName);
                    const styleTokens = await FileStorage.readJson<ITokenFile>(filePath);
                    return { styleType, styleTokens };
                } catch (error) {
                    console.warn(`Failed to load style file: ${path.join(this.tokensDir, fileName)}`, error);
                    return { styleType, styleTokens: {} as ITokenFile };
                }
            })
        );
        return styles.reduce<IDSStyles>(
            (acc, style) => ({ ...acc, [style.styleType]: this.getTokensFromFile(style.styleTokens, '') }) as IDSStyles,
            {}
        );
    }

    /**
     * Loads and processes all style tokens from manifest
     */
    private async loadStyles(styles?: IFigmaStyles): Promise<IDSStyles> {
        if (!styles) return {};

        const styleFileList = this.createStyleFileList(styles);
        const loadedStyles = await this.loadStyleFiles(styleFileList);
        return loadedStyles;
    }

    public async load(): Promise<void> {
        if (this.loaded) return;

        const manifest = await FileStorage.readJson<IManifest>(this.manifestPath);
        if (!manifest) {
            throw new Error(`Failed to load manifest file from: ${this.manifestPath}`);
        }

        this.variables = await this.loadTokenVariables(manifest.collections);
        this.styles = await this.loadStyles(manifest.styles);
        this.loaded = true;
    }

    /**
     * Get all variables (flattened tokens from collections)
     */
    public getVariables(): IDSTokens {
        if (!this.loaded || !this.variables) {
            throw new Error('Tokens not loaded. Call load() first.');
        }
        return this.variables;
    }

    /**
     * Get resolved styles
     */
    public getStyles(): IDSStyles {
        if (!this.loaded || !this.styles) {
            throw new Error('Tokens not loaded. Call load() first.');
        }
        return this.styles;
    }

    /**
     * Checks if a value is a variable reference path
     * @param value - Value to check
     * @returns true if value is a string wrapped in curly braces like {variable.path}
     */
    public isVariableReference(value: any): value is string {
        if (typeof value !== 'string') return false;
        return /^\{.+\}$/.test(value);
    }

    /**
     * Extracts variable path from variable reference string after checking if it's a reference
     * @param value - Value to extract path from
     * @returns variable path if value is a valid reference, undefined otherwise
     */
    public getVariablePath(value: string): string {
        return value.slice(1, -1);
    }

    /**
     * Gets a nested token value by path, similar to lodash.get
     * @param variablePath - Dot-separated string path or array of path segments
     */
    public getToken(variablePath: string | string[]): IDSTokenVariable | undefined {
        if (!this.loaded || !this.variables) {
            throw new Error('Tokens not loaded. Call load() first.');
        }

        // Use lodash.get to get the value by path
        const result = get(this.variables, variablePath);

        if (result && typeof result === 'object') return result as IDSTokenVariable;

        // Search in subgroups with single get operation per subgroup
        for (const [, subgroup] of Object.entries(this.variables)) {
            const token = get(subgroup, variablePath) as IDSTokenVariable;
            if (token?.value) return token;
        }
    }
}
