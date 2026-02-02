import type { IDSTokens, IShadowValue } from '../../classes/TokenManager/types';
import type { IModule } from '../types';
import type { IShadowToken, TShadowTokenValue } from './types';
import { generateShadowFiles, getCSSVariableValue } from './utils';

export interface IShadowsFromTokenManagerInput {
    includeVariables?: string[];
    includeStyles?: boolean;
}

export interface IShadowsFromTokenManagerOutput {
    jsonDir: string;
    stylesDir: string;
    jsonFileName?: string;
    cssFileName?: string;
}

export interface IShadowsFromTokenManagerParams {
    input?: IShadowsFromTokenManagerInput;
    output: IShadowsFromTokenManagerOutput;
}

/**
 * Flattens nested token structures into a flat array of IShadowToken
 */
const flattenTokens = (tokenStructures: IDSTokens, name: string): Record<string, TShadowTokenValue> =>
    Object.keys(tokenStructures).reduce<Record<string, TShadowTokenValue>>(
        (acc, key) => {
            const token = tokenStructures[key];

            const concatName = name ? `${name}-${key}` : key;
            if (token && typeof token === 'object' && 'type' in token && 'value' in token) {
                const variable = {
                    [concatName]: (token.value as IShadowValue[]).map(getCSSVariableValue).join(', '),
                } as Record<string, TShadowTokenValue>;
                return { ...acc, ...variable };
            }
            const flatTokens = flattenTokens(token, concatName);
            return { ...acc, ...flatTokens };
        },
        {} as Record<string, TShadowTokenValue>
    );

const nameParser = (name: string) => `sh-${name}`;

export const shadowsFromTokenManager = ({
    input = {},
    output: { jsonDir, stylesDir, jsonFileName = 'shadows.json', cssFileName = 'shadows.css' },
}: IShadowsFromTokenManagerParams): IModule => ({
    name: 'shadows/tokenManager',
    executor: async ({ tokenManagerClient }) => {
        try {
            console.log(`[shadows/tokenManager] Generating shadows from TokenManager...`);

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

            // Generate shadows from styles if enabled
            if (includeStyles) {
                const styles = tokenManagerClient.getStyles();
                console.log(`[shadows/tokenManager] Processing styles for shadows...`);
                if (styles.effect) tokens.push(styles.effect);
            }
            // Generate shadows from variables if specified
            if (includeVariables?.length) {
                console.log(`[shadows/tokenManager] Processing ${includeVariables.length} variable groups...`);
                const variableShadows = includeVariables.map(key => variables[key]).filter(Boolean) as IDSTokens[];

                tokens.push(...variableShadows);
            }

            const shadowTokens = tokens.flatMap(item =>
                Object.entries(flattenTokens(item, '')).reduce<IShadowToken[]>(
                    (arr, [name, value]) => [...arr, { name: nameParser(name), value }],
                    []
                )
            );
            console.log('shadowTokens=', shadowTokens);

            if (shadowTokens.length === 0) {
                console.warn(`[shadows/tokenManager] No shadow tokens generated`);
                return;
            }

            console.log(`[shadows/tokenManager] Generated ${shadowTokens.length} shadow tokens`);
            console.log(`[shadows/tokenManager] Writing files to ${jsonDir} and ${stylesDir}...`);

            await generateShadowFiles({
                shadowTokens,
                jsonDir,
                stylesDir,
                jsonFileName,
                cssFileName,
            });

            console.log(`[shadows/tokenManager] ✅ Successfully generated shadow files`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[shadows/tokenManager] ❌ Failed to generate shadows:`, errorMessage);
            if (error instanceof Error && error.stack) {
                console.error(`[shadows/tokenManager] Stack trace:`, error.stack);
            }
            throw error;
        }
    },
});
