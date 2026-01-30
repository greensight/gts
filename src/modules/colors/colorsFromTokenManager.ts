import type { TokenManager } from '../../classes/TokenManager';
import type { IDSTokenVariable, IDSTokens, TDSTokenValueWithModes } from '../../classes/TokenManager/types';
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

const resolveColorTokenValue = (
    token: IDSTokenVariable,
    tokenManagerClient: TokenManager,
    mode?: string
): IDSTokenVariable | undefined => {
    const { type, value } = token;

    if (type !== 'color') return;

    if (typeof value === 'string') {
        if (!tokenManagerClient.isVariableReference(value)) return { ...token, value };
        const resolvedValue = tokenManagerClient.getToken(tokenManagerClient.getVariablePath(value));

        const finnalyToken = resolvedValue
            ? resolveColorTokenValue(resolvedValue, tokenManagerClient, mode)
            : undefined;

        return finnalyToken?.value ? { ...token, ...resolvedValue } : undefined;
    }

    const modes = Object.keys(value);

    const parsedValueWithModes = modes.reduce<TDSTokenValueWithModes>((acc, modeKey) => {
        if (mode && modeKey !== mode) return acc;

        const v = (value as Record<string, string>)[modeKey];
        if (typeof v !== 'string') return acc;
        if (!tokenManagerClient.isVariableReference(v)) return { ...acc, [modeKey]: v };

        const resolvedValue = tokenManagerClient.getToken(tokenManagerClient.getVariablePath(v));

        const finnalyToken = resolvedValue
            ? resolveColorTokenValue(resolvedValue, tokenManagerClient, modeKey)
            : undefined;

        return finnalyToken?.value ? { ...acc, ...(finnalyToken.value as TDSTokenValueWithModes) } : acc;
    }, {});

    if (!Object.keys(parsedValueWithModes).length) return;
    return { ...token, value: parsedValueWithModes };
};

const resolveColorTokens = (tokens: IDSTokens, tokenManagerClient: TokenManager): IDSTokens => {
    return Object.keys(tokens).reduce<IDSTokens>((acc, key) => {
        const token = tokens[key];

        if (token.type && token.value) {
            const resolvedColorTokenValue = resolveColorTokenValue(token as IDSTokenVariable, tokenManagerClient);
            return resolvedColorTokenValue ? { ...acc, [key]: resolvedColorTokenValue } : acc;
        }
        const resolvedColorTokens = resolveColorTokens(token as IDSTokens, tokenManagerClient);

        return resolvedColorTokens ? { ...acc, [key]: resolvedColorTokens } : acc;
    }, {});
};

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
            // Generate colors from variables if specified
            if (includeVariables?.length) {
                console.log(`[colors/tokenManager] Processing ${includeVariables.length} variable groups...`);
                const variableColors = includeVariables.map(key => variables[key]).filter(Boolean) as IDSTokens[];

                tokens.push(...variableColors);
            }

            const colorTokens = tokens
                .map(token => resolveColorTokens(token, tokenManagerClient))
                .flatMap(item =>
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
