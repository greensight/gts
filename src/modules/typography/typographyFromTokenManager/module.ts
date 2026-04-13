import type { TokenManager } from '../../../classes/TokenManager';
import type { IDSTokenStyleTypography, IDSTokens, ITypographyValue } from '../../../classes/TokenManager/types';
import type { IModule } from '../../types';
import type { IResolveValue, ITypographyToken } from '../types';
import { generateTypographyFiles } from '../utils';

export interface IBreakpoints {
    [key: string]: string;
}

export type IFontFamilyMap = Record<string, string>;

export interface ITypographyFromTokenManagerInput {
    breakpoints: IBreakpoints;
    fontFamily?: IFontFamilyMap;
}

export interface ITypographyFromTokenManagerOutput {
    dir: string;
}

export interface ITypographyFromTokenManagerParams {
    input: ITypographyFromTokenManagerInput;
    output: ITypographyFromTokenManagerOutput;
}

interface ITokenStructureVariable {
    type: 'typography';
    value: IResolveValue;
}

interface ITokenStructures {
    [key: string]: ITokenStructureVariable | ITokenStructures;
}

const resolveTypographyTokens = (
    tokens: IDSTokens<IDSTokenStyleTypography>,
    tokenManagerClient: TokenManager,
    options: { breakpoints: IBreakpoints }
): ITokenStructures =>
    Object.keys(tokens).reduce<ITokenStructures>((acc, key) => {
        const obj = tokens[key];
        if (typeof obj !== 'object' || Array.isArray(obj)) return acc;

        if (!('type' in obj) || !('value' in obj))
            return { ...acc, [key]: resolveTypographyTokens(obj, tokenManagerClient, options) };

        if (obj.type !== 'typography') return acc;
        const value = obj.value as ITypographyValue;

        const resolvedValue = Object.entries(value).reduce<IResolveValue>(
            (rv, [k, v]: [string, string]) => {
                const bpKeys = Object.keys(options.breakpoints);
                if (bpKeys.length) {
                    bpKeys.forEach(bp => {
                        const token = tokenManagerClient.resolveVariableValueString(v, bp);
                        if (token) {
                            if (token === v) {
                                rv.base = { ...rv.base, [k]: token };
                            } else {
                                rv.breakpoints[bp] = { ...rv.breakpoints[bp], [k]: token };
                            }
                        }
                    });
                } else {
                    const token = tokenManagerClient.resolveVariableValueString(v);
                    if (token) rv.base = { ...rv.base, [k]: token };
                }

                return rv;
            },
            { base: {}, breakpoints: {} }
        );

        return { ...acc, [key]: { type: 'typography', value: resolvedValue } };
    }, {});

const flattenTokens = (tokenStructure: ITokenStructures, name?: string): Record<string, IResolveValue> => {
    return Object.keys(tokenStructure).reduce<Record<string, IResolveValue>>((acc, key) => {
        const concatName = name ? `${name}-${key}` : key;
        const token = tokenStructure[key];

        if (!('type' in token) || !('value' in token)) {
            return { ...acc, ...flattenTokens(token, concatName) };
        }

        const resolvedValue = token.value as IResolveValue;
        return { ...acc, [concatName]: resolvedValue };
    }, {});
};

export const typographyFromTokenManager = ({ input, output: { dir } }: ITypographyFromTokenManagerParams): IModule => ({
    name: 'typography/tokenManager',
    executor: async ({ tokenManagerClient }) => {
        try {
            console.log(`[typography/tokenManager] Generating typography from TokenManager...`);

            const { breakpoints, fontFamily } = input;

            // Check if TokenManager has loaded tokens
            if (!tokenManagerClient.isLoaded()) {
                throw new Error('TokenManager is not loaded. Tokens must be loaded before using this module.');
            }

            const tokens: IDSTokens<IDSTokenStyleTypography>[] = [];

            const styles = tokenManagerClient.getStyles();
            console.log(`[typography/tokenManager] Processing styles for typography...`);
            if (styles.text) tokens.push(styles.text);

            const resolvedTypographyTokens = tokens.reduce<ITokenStructures>(
                (acc, item) => ({
                    ...acc,
                    ...resolveTypographyTokens(item, tokenManagerClient, { breakpoints: input.breakpoints }),
                }),
                {}
            );

            const typographyTokens: ITypographyToken[] = Object.entries(flattenTokens(resolvedTypographyTokens)).map(
                ([key, value]) => ({ name: key, value })
            );

            if (typographyTokens.length === 0) {
                console.warn(`[typography/tokenManager] No typography tokens generated`);
                return;
            }

            console.log(`[typography/tokenManager] Generated ${typographyTokens.length} typography tokens`);
            console.log(`[typography/tokenManager] Writing files to ${dir}...`);

            await generateTypographyFiles({
                typographyTokens,
                dir,
                breakpoints,
                fontFamily: fontFamily || {},
            });

            console.log(`[typography/tokenManager] ✅ Successfully generated typography files`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[typography/tokenManager] ❌ Failed to generate typography:`, errorMessage);
            if (error instanceof Error && error.stack) {
                console.error(`[typography/tokenManager] Stack trace:`, error.stack);
            }
            throw error;
        }
    },
});
