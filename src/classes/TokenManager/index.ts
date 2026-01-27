import path from 'path';

import { FileStorage } from '../FileStorage';
import type {
    ICollections,
    IFigmaStyles,
    IFigmaTokenResolutionOptions,
    IFigmaTokenStyles,
    IFigmaTokenVariables,
    IManifest,
    IRawFigmaTokenFile,
    ITokenFile,
    ITypographyValue,
    ResolvedTokenFile,
    TDesignFigmaToken,
    TTokenModes,
} from './types';

export class TokenManager {
    // files
    private tokensDir: string;
    private manifestPath: string;

    // settings
    private options: IFigmaTokenResolutionOptions;

    // figma data
    private variables?: IFigmaTokenVariables;
    private styles?: IFigmaTokenStyles;

    // flags
    private loaded = false;

    constructor(tokensDir: string, options: IFigmaTokenResolutionOptions = {}) {
        this.tokensDir = tokensDir;
        this.manifestPath = path.join(this.tokensDir, 'manifest.json');
        this.options = { defaultMode: 'Mode 1', modePriority: [], ...options };
    }

    /**
     * Loads and processes all token variables from manifest collections
     */
    private async loadTokenVariables(manifest: IManifest): Promise<IFigmaTokenVariables> {
        const { modePriority } = this.options;

        try {
            const variableFileList = this.createVariableFileList(manifest.collections, modePriority || []);
            const loadedVariables = await this.loadVariableFiles(variableFileList);
            const mergedVariables = this.mergeVariableResults(loadedVariables);
            const simplifiedVariables = this.simplifySingleModeEntries(mergedVariables);

            return this.normalizeVariablesKeys(simplifiedVariables);
        } catch (error) {
            throw new Error(`Failed to load token variables from ${this.tokensDir}: ${error}`);
        }
    }

    /**
     * Creates a flat list of variable files to process from manifest collections
     */
    private createVariableFileList(
        collections: ICollections,
        modePriority: string[]
    ): Array<{
        fileName: string;
        modeName: string;
        collectionName: string;
    }> {
        return Object.entries(collections).flatMap(([collectionName, collection]) =>
            Object.entries(collection.modes)
                .filter(([modeName]) => modePriority.length === 0 || modePriority.includes(modeName))
                .flatMap(([modeName, fileNames]) =>
                    fileNames.map(fileName => ({
                        fileName,
                        modeName: this.normalizeKey(modeName.trim()),
                        collectionName,
                    }))
                )
        );
    }

    /**
     * Loads all variable files in parallel and returns processed results
     */
    private async loadVariableFiles(
        variableFiles: Array<{ fileName: string; modeName: string; collectionName: string }>
    ): Promise<Array<IFigmaTokenVariables>> {
        return Promise.all(
            variableFiles.map(async ({ fileName, modeName, collectionName }) => {
                try {
                    const filePath = path.join(this.tokensDir, fileName);
                    const tokens = await FileStorage.readJson<ITokenFile>(filePath);
                    return this.processTokensFile(tokens, modeName, collectionName);
                } catch (error) {
                    console.warn(`Failed to load variable file: ${path.join(this.tokensDir, fileName)}`, error);
                    return {} as IFigmaTokenVariables;
                }
            })
        );
    }

    /**
     * Merges multiple IFigmaTokenVariables objects into one
     */
    private mergeVariableResults(variableResults: Array<IFigmaTokenVariables>): IFigmaTokenVariables {
        return variableResults.reduce(
            (merged, current) => this.mergeTokenVariables(merged, current),
            {} as IFigmaTokenVariables
        );
    }

    private processTokensFile(tokens: ITokenFile, modeName: string, collectionName: string): IFigmaTokenVariables {
        const normalizedCollectionName = this.normalizeKey(collectionName);
        const result: IFigmaTokenVariables = {};

        Object.entries(tokens).forEach(([tokenKey, tokenValue]) => {
            if (this.isDesignToken(tokenValue)) {
                const normalizedTokenKey = this.normalizeKey(tokenKey);
                if (!result[normalizedCollectionName]) {
                    result[normalizedCollectionName] = {};
                }
                // Preserve full token structure instead of just $value
                result[normalizedCollectionName][normalizedTokenKey] = { [modeName]: tokenValue };
                return;
            }

            // Handle nested subgroups within the collection
            const normalizedSubgroupKey = this.normalizeKey(tokenKey);
            const subgroupData = this.processSubgroupWithMode(tokenValue as ITokenFile, modeName);

            // Ensure collection exists
            if (!result[normalizedCollectionName]) {
                result[normalizedCollectionName] = {};
            }

            // Preserve subgroup structure within the collection
            const collection = result[normalizedCollectionName] as any;
            if (collection[normalizedSubgroupKey]) {
                // Merge with existing subgroup
                Object.entries(subgroupData).forEach(([key, modes]) => {
                    if (collection[normalizedSubgroupKey][key]) {
                        // Both are TokenModes objects, merge them
                        const existing = collection[normalizedSubgroupKey][key] as TTokenModes;
                        collection[normalizedSubgroupKey][key] = { ...existing, ...modes };
                    } else {
                        collection[normalizedSubgroupKey][key] = modes;
                    }
                });
            } else {
                collection[normalizedSubgroupKey] = subgroupData;
            }
        });

        return result;
    }

    private processSubgroupWithMode(subgroupTokens: ITokenFile, modeName: string): Record<string, TTokenModes> {
        return Object.entries(subgroupTokens).reduce(
            (subgroupResult, [key, value]) => {
                if (this.isDesignToken(value)) {
                    if (!subgroupResult[key]) {
                        subgroupResult[key] = {};
                    }
                    // Preserve full token structure
                    subgroupResult[key][modeName] = value;
                }
                return subgroupResult;
            },
            {} as Record<string, TTokenModes>
        );
    }

    private mergeTokenVariables(target: IFigmaTokenVariables, source: IFigmaTokenVariables): IFigmaTokenVariables {
        const result = { ...target };

        Object.entries(source).forEach(([subgroupKey, subgroupData]) => {
            if (result[subgroupKey]) {
                // Merge subgroups
                Object.entries(subgroupData).forEach(([key, value]) => {
                    if (result[subgroupKey][key]) {
                        // If both are objects, merge them deeply
                        const existing = result[subgroupKey][key];
                        if (
                            typeof existing === 'object' &&
                            typeof value === 'object' &&
                            !Array.isArray(existing) &&
                            !Array.isArray(value)
                        ) {
                            // Deep merge for token groups with modes
                            const merged = { ...existing } as any;
                            const valueAny = value as any;
                            for (const tokenKey in valueAny) {
                                if (
                                    merged[tokenKey] &&
                                    typeof merged[tokenKey] === 'object' &&
                                    typeof valueAny[tokenKey] === 'object'
                                ) {
                                    // Merge TTokenModes
                                    merged[tokenKey] = { ...merged[tokenKey], ...valueAny[tokenKey] };
                                } else {
                                    merged[tokenKey] = valueAny[tokenKey];
                                }
                            }
                            result[subgroupKey][key] = merged;
                        } else {
                            // Overwrite with the new value
                            result[subgroupKey][key] = value;
                        }
                    } else {
                        result[subgroupKey][key] = value;
                    }
                });
            } else {
                result[subgroupKey] = subgroupData;
            }
        });

        return result;
    }

    private simplifySingleModeEntries(variables: IFigmaTokenVariables): IFigmaTokenVariables {
        const result: IFigmaTokenVariables = {};

        Object.entries(variables).forEach(([subgroupKey, subgroupData]) => {
            result[subgroupKey] = {};

            Object.entries(subgroupData).forEach(([key, value]) => {
                if (typeof value === 'object' && !Array.isArray(value)) {
                    // It's a modes object
                    const modeKeys = Object.keys(value);
                    if (modeKeys.length === 1) {
                        // If only one mode, use the value directly
                        result[subgroupKey][key] = (value as TTokenModes)[modeKeys[0]];
                    } else {
                        // Keep the modes structure
                        result[subgroupKey][key] = value as TTokenModes;
                    }
                } else {
                    // It's already a direct value
                    result[subgroupKey][key] = value;
                }
            });
        });

        return result;
    }

    /**
     * Converts a string with spaces, hyphens, or underscores to camelCase format
     * Preserves existing camelCase and PascalCase strings
     * Examples: "font size" -> "fontSize", "font-size" -> "fontSize", "font_size" -> "fontSize", "fontSize" -> "fontSize"
     */
    private convertToCamelCase(key: string): string {
        if (!key.trim()) return key;

        // If no separators and already camelCase/PascalCase, return as-is
        if (!/[-_\s]/.test(key)) {
            return key;
        }

        // Replace hyphens, underscores and spaces with spaces, then split and process
        return key
            .replace(/[-_\s]+/g, ' ')
            .split(' ')
            .filter(word => word.length)
            .map((word, index) => {
                const firstChar = word.charAt(0);
                const restOfWord = word.slice(1);

                // First word: all lowercase, other words: first letter uppercase, rest as-is
                return index === 0 ? word.toLowerCase() : firstChar.toUpperCase() + restOfWord;
            })
            .join('');
    }

    private normalizeKey(key: string): string {
        // Special mapping for known group names
        const groupNameMapping: Record<string, string> = {
            Text_sizes: 'fontSize',
            Line_heights: 'lineHeights',
        };

        return groupNameMapping[key] || this.convertToCamelCase(key);
    }

    /**
     * Recursively normalizes object keys to camelCase and processes token values
     */
    private normalizeObjectKeys(tokens: ITokenFile): IRawFigmaTokenFile {
        const normalizedTokens: IRawFigmaTokenFile = {};

        for (const [originalKey, tokenValue] of Object.entries(tokens)) {
            const camelCaseKey = this.normalizeKey(originalKey);

            if (this.isDesignToken(tokenValue)) {
                // Process token values to normalize variable references
                // Only typography tokens have nested objects that need processing
                let processedValue = tokenValue.$value;

                if (tokenValue.$type === 'typography' && this.isPlainObject(tokenValue.$value)) {
                    processedValue = this.parseStyleValue(tokenValue.$value) as unknown as ITypographyValue;
                }

                normalizedTokens[camelCaseKey] = {
                    ...tokenValue,
                    $value: processedValue,
                } as TDesignFigmaToken;
            } else if (this.isPlainObject(tokenValue)) {
                // Recursively process nested token groups
                normalizedTokens[camelCaseKey] = this.normalizeObjectKeys(tokenValue);
            }
        }

        return normalizedTokens;
    }

    /**
     * Recursively normalizes keys in variables structure and processes variable references
     */
    private normalizeVariablesKeys(variables: IFigmaTokenVariables): IFigmaTokenVariables {
        const normalizedVariables: IFigmaTokenVariables = {};

        for (const [subgroupKey, subgroupData] of Object.entries(variables)) {
            const normalizedSubgroupKey = this.normalizeKey(subgroupKey);
            normalizedVariables[normalizedSubgroupKey] = {};

            for (const [tokenKey, tokenValue] of Object.entries(subgroupData)) {
                const normalizedTokenKey = this.normalizeKey(tokenKey);

                if (typeof tokenValue === 'object' && !Array.isArray(tokenValue)) {
                    // Handle TTokenModes (multiple modes)
                    const normalizedModes: TTokenModes = {};
                    for (const [modeKey, modeValue] of Object.entries(tokenValue)) {
                        const normalizedModeKey = this.normalizeKey(modeKey);
                        normalizedModes[normalizedModeKey] = this.processToken(modeValue as TDesignFigmaToken);
                    }
                    normalizedVariables[normalizedSubgroupKey][normalizedTokenKey] = normalizedModes;
                } else {
                    // Handle single TDesignFigmaToken
                    normalizedVariables[normalizedSubgroupKey][normalizedTokenKey] = this.processToken(
                        tokenValue as TDesignFigmaToken
                    );
                }
            }
        }

        return normalizedVariables;
    }

    /**
     * Processes a token to normalize variable references within its value
     */
    private processToken(token: TDesignFigmaToken): TDesignFigmaToken {
        if (token.$type === 'typography' && this.isPlainObject(token.$value)) {
            // Handle typography values - normalize keys and variable references
            const processedValue = this.parseStyleValue(token.$value) as unknown as ITypographyValue;
            return { ...token, $value: processedValue };
        }

        if (typeof token.$value === 'string') {
            // Handle string values - normalize variable references
            const processedValue = this.replaceVariableReferences(token.$value);
            return { ...token, $value: processedValue } as TDesignFigmaToken;
        }

        // Arrays and other types remain unchanged
        return token;
    }

    /**
     * Normalizes variable references in curly braces to camelCase
     * Example: "{font size}" -> "{fontSize}"
     */
    private normalizeVariableReference(value: string): string {
        const isWrappedInBraces = value.startsWith('{') && value.endsWith('}');

        if (isWrappedInBraces) {
            const variableName = value.slice(1, -1); // Remove braces
            const normalizedName = this.convertToCamelCase(variableName);
            return `{${normalizedName}}`;
        }

        return value;
    }

    /**
     * Recursively processes object values to normalize keys and variable references
     * Handles nested objects, normalizes property names to camelCase, and replaces {variable name} patterns
     */
    private parseStyleValue(value: Record<string, unknown>): Record<string, unknown> {
        const processedValue: Record<string, unknown> = {};

        for (const [property, propertyValue] of Object.entries(value)) {
            const normalizedProperty = this.normalizeKey(property);

            if (typeof propertyValue === 'string') {
                // Replace variable references in strings
                processedValue[normalizedProperty] = this.replaceVariableReferences(propertyValue);
            } else if (this.isPlainObject(propertyValue)) {
                // Recursively process nested objects
                processedValue[normalizedProperty] = this.parseStyleValue(propertyValue);
            } else {
                // Keep arrays and other types as-is
                processedValue[normalizedProperty] = propertyValue;
            }
        }

        return processedValue;
    }

    /**
     * Replaces all {variable name} patterns with normalized {variableName} format
     */
    private replaceVariableReferences(text: string): string {
        return text.replace(/\{([^}]+)\}/g, match => this.normalizeVariableReference(match));
    }

    /**
     * Checks if value is a plain object (not null, not array)
     */
    private isPlainObject(value: unknown): value is Record<string, unknown> {
        return typeof value === 'object' && value !== null && !Array.isArray(value);
    }

    /**
     * Type guard to check if an object is a valid Figma design token
     */
    private isDesignToken(obj: unknown): obj is TDesignFigmaToken {
        return obj !== null && typeof obj === 'object' && '$type' in obj && '$value' in obj;
    }

    /**
     * Loads and processes all style tokens from manifest
     */
    private async loadStyles(styles?: IFigmaStyles): Promise<IFigmaTokenStyles> {
        if (!styles) return {};

        const styleFileList = this.createStyleFileList(styles);
        const loadedStyles = await this.loadStyleFiles(styleFileList);
        return this.mergeStyleResults(loadedStyles);
    }

    /**
     * Creates a flat list of style files to process from manifest styles
     */
    private createStyleFileList(styles: IFigmaStyles): Array<{
        styleType: keyof IFigmaTokenStyles;
        fileName: string;
    }> {
        return Object.entries(styles).flatMap(
            ([styleType, fileNames]) =>
                fileNames?.map((fileName: string) => ({
                    styleType: styleType as keyof IFigmaTokenStyles,
                    fileName,
                })) || []
        );
    }

    /**
     * Loads all style files in parallel and returns results
     */
    private async loadStyleFiles(
        styleFiles: Array<{ styleType: keyof IFigmaTokenStyles; fileName: string }>
    ): Promise<Array<{ styleType: keyof IFigmaTokenStyles; resolvedTokens: ITokenFile }>> {
        return Promise.all(
            styleFiles.map(async ({ styleType, fileName }) => {
                try {
                    const filePath = path.join(this.tokensDir, fileName);
                    const styleTokens = await FileStorage.readJson<ITokenFile>(filePath);
                    return { styleType, resolvedTokens: styleTokens };
                } catch (error) {
                    console.warn(`Failed to load style file: ${path.join(this.tokensDir, fileName)}`, error);
                    return { styleType, resolvedTokens: {} as ITokenFile };
                }
            })
        );
    }

    /**
     * Merges loaded style results into IFigmaTokenStyles structure
     */
    private mergeStyleResults(
        styleResults: Array<{ styleType: keyof IFigmaTokenStyles; resolvedTokens: ITokenFile }>
    ): IFigmaTokenStyles {
        return styleResults.reduce<IFigmaTokenStyles>((acc, { styleType, resolvedTokens }) => {
            const currentTokens = acc[styleType] || {};
            acc[styleType] = { ...currentTokens, ...this.normalizeObjectKeys(resolvedTokens) };
            return acc;
        }, {});
    }

    /**
     * Loads and parses all design tokens and styles from the token directory
     * This method should be called before accessing any token data
     * @throws Error if manifest file cannot be loaded
     */
    public async load(): Promise<void> {
        if (this.loaded) {
            return; // Already loaded, skip
        }

        const manifest = await FileStorage.readJson<IManifest>(this.manifestPath);
        if (!manifest) {
            throw new Error(`Failed to load manifest file from: ${this.manifestPath}`);
        }

        this.variables = await this.loadTokenVariables(manifest);
        this.styles = await this.loadStyles(manifest.styles);
        this.loaded = true;
    }

    /**
     * Get all variables (flattened tokens from collections)
     */
    public getVariables(): IFigmaTokenVariables {
        if (!this.loaded || !this.variables) {
            throw new Error('Tokens not loaded. Call load() first.');
        }
        return this.variables;
    }

    /**
     * Get resolved styles
     */
    public getStyles(): IFigmaTokenStyles {
        if (!this.loaded || !this.styles) {
            throw new Error('Tokens not loaded. Call load() first.');
        }
        return this.styles;
    }

    /**
     * Get specific style type
     */
    public getTextStyles(): ResolvedTokenFile | undefined {
        return this.getStyles().text;
    }

    public getEffectStyles(): ResolvedTokenFile | undefined {
        return this.getStyles().effect;
    }

    public getColorStyles(): ResolvedTokenFile | undefined {
        return this.getStyles().color;
    }

    public getGridStyles(): ResolvedTokenFile | undefined {
        return this.getStyles().grid;
    }

    /**
     * Get a specific subgroup
     */
    public getSubgroup(
        subgroupKey: string
    ): Record<string, TDesignFigmaToken | TTokenModes | Record<string, TDesignFigmaToken | TTokenModes>> | undefined {
        const variables = this.getVariables();
        return variables[subgroupKey]; // subgroupKey is not normalized for variables
    }

    /**
     * Get a specific variable by subgroup and key
     */
    public getVariable(
        subgroupKey: string,
        key: string
    ): TDesignFigmaToken | TTokenModes | Record<string, TDesignFigmaToken | TTokenModes> | undefined {
        const subgroup = this.getSubgroup(subgroupKey);
        const normalizedKey = this.normalizeKey(key);
        return subgroup?.[normalizedKey] || (subgroup as any)?.[key];
    }

    /**
     * Check if tokens are loaded
     */
    public isLoaded(): boolean {
        return this.loaded;
    }
}
