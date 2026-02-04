import type { TokenManager } from '../../../classes/TokenManager';
import type { IDSTokenStyleGrid, IDSTokens } from '../../../classes/TokenManager/types';
import { isEqual } from '../../../common/lodash';
import type { IModule } from '../../types';
import type { IContainerToken } from '../types';
import { generateContainerFiles } from '../utils';

export interface IContainerFromTokenManagerInput {
    containerWidth?: number;
    layer?: string;
    isModule?: boolean;
}

export interface IContainerFromTokenManagerOutput {
    stylesDir: string;
    fileName?: string;
}

export interface IContainerFromTokenManagerParams {
    input?: IContainerFromTokenManagerInput;
    output: IContainerFromTokenManagerOutput;
}

/**
 * Extracts container tokens from grid styles tokens
 */
const extractContainerTokens = (
    gridStyles: IDSTokens<IDSTokenStyleGrid>,
    tokenManagerClient: TokenManager,
    options: { width: number }
): IContainerToken[] => {
    const containerTokens: IContainerToken[] = [];

    // Process each breakpoint
    Object.keys(gridStyles).forEach(breakpointKey => {
        const gridData = gridStyles[breakpointKey];

        if (gridData && gridData.value && Array.isArray(gridData.value)) {
            const validGridItems = gridData.value.filter(
                item => item.pattern === 'columns' && (item.alignment === 'center' || item.alignment === 'stretch')
            );

            validGridItems.forEach(item => {
                if (item.alignment === 'center') {
                    containerTokens.push({
                        name: breakpointKey,
                        value: {
                            alignment: 'center',
                            width: options.width,
                            margin: 'auto',
                        },
                    });
                }

                if (item.alignment === 'stretch') {
                    const margin = tokenManagerClient.resolveVariableValueString(item.offset);
                    if (!margin) return;
                    containerTokens.push({
                        name: breakpointKey,
                        value: {
                            alignment: 'stretch',
                            margin,
                        },
                    });
                }
            });
        }
    });

    // Sort by breakpoint from largest to smallest
    const sortedTokens = containerTokens.sort((a, b) => {
        const aBreakpoint = parseInt(a.name);
        const bBreakpoint = parseInt(b.name);
        return bBreakpoint - aBreakpoint;
    });

    // Remove duplicates - if consecutive tokens have same properties, remove the later one
    const filteredTokens = sortedTokens.reduce<IContainerToken[]>((acc, current) => {
        const previous = acc[acc.length - 1];

        // Check if current token has same properties as previous
        const isDuplicate = previous && isEqual(previous.value, current.value);

        if (!isDuplicate) {
            acc.push(current);
        }

        return acc;
    }, []);

    return filteredTokens;
};

export const containerFromTokenManager = ({
    input = {},
    output: { stylesDir, fileName = 'container' },
}: IContainerFromTokenManagerParams): IModule => ({
    name: 'container/tokenManager',
    executor: async ({ tokenManagerClient }) => {
        try {
            console.log(`[container/tokenManager] Generating container styles...`);

            const { containerWidth = 1440, layer, isModule = true } = input;

            // Check if TokenManager has loaded tokens
            if (!tokenManagerClient.isLoaded()) {
                throw new Error('TokenManager is not loaded. Tokens must be loaded before using this module.');
            }

            console.log(`[container/tokenManager] Extracting container tokens...`);

            // Get grid styles
            const styles = tokenManagerClient.getStyles();
            if (!styles.grid) {
                throw new Error('No grid styles found in TokenManager. Grid tokens must be loaded.');
            }

            // Extract container tokens
            const containerTokens = extractContainerTokens(styles.grid, tokenManagerClient, { width: containerWidth });

            if (!containerTokens.length) {
                console.warn(`[container/tokenManager] No container tokens found.`);
                return;
            }

            console.log(
                `[container/tokenManager] Found ${containerTokens.length} container tokens: ${containerTokens.map(c => c.name).join(', ')}`
            );

            // Generate container file
            await generateContainerFiles({
                containerTokens,
                stylesDir,
                fileName,
                layer,
                isModule,
            });

            console.log(`[container/tokenManager] Container styles generated successfully.`);
        } catch (error) {
            console.error(`[container/tokenManager] Error:`, error);
            throw error;
        }
    },
});
