import type { IDSTokens, TDSTokenValueWithModes } from '../../classes/TokenManager/types';
import type { IColorToken, TColorTokenValue } from '../colors/types';
import { generateColorFiles } from '../colors/utils';
import type { IModule } from '../types';

export interface IColorsFromTokenManagerInput {
    includeVariables?: string[];
    includeStyles?: boolean;
}

export interface IColorsFromTokenManagerOutput {
    jsonDir: string;
    stylesDir: string;
    jsonFileName?: string;
    cssFileName?: string;
}

export interface IColorsFromTokenManagerParams {
    input?: IColorsFromTokenManagerInput;
    output: IColorsFromTokenManagerOutput;
}

/**
 * Flattens nested token structures into a flat array of IColorToken
 */
const flattenTokens = (tokenStructures: IDSTokens, name: string): Record<string, TColorTokenValue> =>
    Object.keys(tokenStructures).reduce<Record<string, TColorTokenValue>>(
        (acc, key) => {
            const token = tokenStructures[key];

            const concatName = name ? `${name}-${key}` : key;
            if (token && typeof token === 'object' && 'type' in token && 'value' in token) {
                const modes = Object.keys(token.value);
                const value = modes.length > 1 ? token.value : (token.value as TDSTokenValueWithModes)[modes[0]];
                const variable = { [concatName]: value } as Record<string, TColorTokenValue>;
                return { ...acc, ...variable };
            }
            const flatTokens = flattenTokens(token, concatName);
            return { ...acc, ...flatTokens };
        },
        {} as Record<string, TColorTokenValue>
    );

const nameParser = (name: string) => `cl-${name}`;

export const colorsFromTokenManager = ({
    input = {},
    output: { jsonDir, stylesDir, jsonFileName = 'colors.json', cssFileName = 'colors.css' },
}: IColorsFromTokenManagerParams): IModule => ({
    name: 'colors/tokenManager',
    executor: async ({ tokenManagerClient }) => {
        try {
            console.log(`[colors/tokenManager] Generating colors from TokenManager...`);

            const { includeVariables, includeStyles = true } = input;

            // Validate input
            if (!includeVariables?.length && !includeStyles) {
                throw new Error('Either includeVariables or includeStyles must be enabled');
            }

            // Check if TokenManager has loaded tokens
            if (!tokenManagerClient.isLoaded()) {
                throw new Error('TokenManager is not loaded. Tokens must be loaded before using this module.');
            }

            const tokens: IDSTokens[] = [];

            const variables = tokenManagerClient.getVariables();

            // Generate colors from styles if enabled
            if (includeStyles) {
                const styles = tokenManagerClient.getStyles();
                console.log(`[colors/tokenManager] Processing styles for colors...`);
                if (styles.color) tokens.push(styles.color);
            }
            console.log('tokens', includeStyles, tokens, tokenManagerClient.getStyles());
            // Generate colors from variables if specified
            if (includeVariables?.length) {
                console.log(`[colors/tokenManager] Processing ${includeVariables.length} variable groups...`);
                const variableColors = includeVariables.map(key => variables[key]).filter(Boolean) as IDSTokens[];

                tokens.push(...variableColors);
            }

            const colorTokens = tokens.flatMap(item =>
                Object.entries(flattenTokens(item, '')).reduce<IColorToken[]>(
                    (arr, [name, value]) => [...arr, { name: nameParser(name), value }],
                    []
                )
            );

            if (colorTokens.length === 0) {
                console.warn(`[colors/tokenManager] No color tokens generated`);
                return;
            }

            console.log(`[colors/tokenManager] Generated ${colorTokens.length} color tokens`);
            console.log(`[colors/tokenManager] Writing files to ${jsonDir} and ${stylesDir}...`);

            await generateColorFiles({
                colorTokens,
                jsonDir,
                stylesDir,
                jsonFileName,
                cssFileName,
            });

            console.log(`[colors/tokenManager] ✅ Successfully generated color files`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[colors/tokenManager] ❌ Failed to generate colors:`, errorMessage);
            if (error instanceof Error && error.stack) {
                console.error(`[colors/tokenManager] Stack trace:`, error.stack);
            }
            throw error;
        }
    },
});
