import type { IDSTokens, TDSTokenVariablesValue } from '../../classes/TokenManager/types';
import type { IColorToken } from '../colors/types';
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

// const getResolvedColors = (tokens: IDSTokens | TDSTokenVariablesValue) => {
//     return Object.entries(tokens).reduce((acc, [key, value]) => {
//         if (typeof value === 'object') {
//             return { ...acc, ...getResolvedColors(value) };
//         }
//         return { ...acc, [key]: value };
//     }, {} as Record<string, string>);
// };

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

            const variables = tokenManagerClient.getVariables();
            const colorTokens: (IDSTokens | TDSTokenVariablesValue)[] = [];

            // Generate colors from styles if enabled
            // if (includeStyles) {
            //     console.log(`[colors/tokenManager] Processing styles for colors...`);
            //     colorTokens.push(...processStylesForColors(tokenManagerClient, variables));
            // }

            // Generate colors from variables if specified
            if (includeVariables?.length) {
                console.log(`[colors/tokenManager] Processing ${includeVariables.length} variable groups...`);
                colorTokens.push(
                    includeVariables.reduce<(IDSTokens | TDSTokenVariablesValue)[]>((acc, key) => {
                        const colors = variables[key];
                        if (colors) acc.push(colors);
                        return acc;
                    }, [])
                );
            }

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
