import type { TokenManager } from '../../../classes/TokenManager';
import type { IDSTokenStyleGrid, IDSTokens } from '../../../classes/TokenManager/types';
import { isEqual } from '../../../common/lodash';
import type { IModule } from '../../types';
import type { IContainerToken } from '../types';
import { generateContainerFiles } from '../utils';

export interface IContainerFromTokenManagerInput {
    layer?: string;
}

export interface IContainerFromTokenManagerOutput {
    dir: string;
}

export interface IContainerFromTokenManagerParams {
    input?: IContainerFromTokenManagerInput;
    output: IContainerFromTokenManagerOutput;
}

const isZeroOffset = (offset: string): boolean => {
    const normalizedOffset = offset.trim().toLowerCase();
    return normalizedOffset === '0' || normalizedOffset === '0px';
};

/**
 * Extracts container tokens from grid styles tokens
 */
const extractContainerTokens = (
    gridStyles: IDSTokens<IDSTokenStyleGrid>,
    tokenManagerClient: TokenManager
): IContainerToken[] => {
    const sortedBreakpoints = Object.keys(gridStyles)
        .filter(key => !isNaN(Number(key)))
        .sort((a, b) => Number(b) - Number(a));

    const containerTokens = sortedBreakpoints.reduce<IContainerToken[]>((acc, breakpointKey) => {
        const gridData = gridStyles[breakpointKey];
        if (!gridData || !('value' in gridData) || !Array.isArray(gridData.value)) {
            return acc;
        }

        const columnsGridItem = gridData.value.find(item => item.pattern === 'columns');
        if (!columnsGridItem?.offset) {
            return acc;
        }

        const resolvedOffset = tokenManagerClient.resolveVariableValueString(columnsGridItem.offset);
        if (!resolvedOffset || typeof resolvedOffset !== 'string') {
            return acc;
        }
        if (isZeroOffset(resolvedOffset)) {
            return acc;
        }

        return [
            ...acc,
            {
                breakpoint: Number(breakpointKey),
                offset: resolvedOffset,
            },
        ];
    }, []);

    // Remove consecutive duplicates by offset
    const filteredTokens = containerTokens.reduce<IContainerToken[]>((acc, current) => {
        const previous = acc[acc.length - 1];
        const isDuplicate = previous && isEqual(previous.offset, current.offset);

        if (!isDuplicate) {
            acc.push(current);
        }

        return acc;
    }, []);

    return filteredTokens;
};

export const containerFromTokenManager = ({
    input = {},
    output: { dir },
}: IContainerFromTokenManagerParams): IModule => ({
    name: 'container/tokenManager',
    executor: async ({ tokenManagerClient }) => {
        try {
            console.log(`[container/tokenManager] Generating container styles...`);

            const { layer } = input;

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
            const containerTokens = extractContainerTokens(styles.grid, tokenManagerClient);

            if (!containerTokens.length) {
                console.warn(`[container/tokenManager] No container tokens found.`);
                return;
            }

            console.log(
                `[container/tokenManager] Found ${containerTokens.length} container tokens: ${containerTokens.map(c => c.breakpoint).join(', ')}`
            );
            console.log(`[container/tokenManager] Writing files to ${dir}...`);

            // Generate container files
            await generateContainerFiles({
                containerTokens,
                dir,
                layer,
            });

            console.log(`[container/tokenManager] ✅ Successfully generated container files`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[container/tokenManager] ❌ Failed to generate container:`, errorMessage);
            if (error instanceof Error && error.stack) {
                console.error(`[container/tokenManager] Stack trace:`, error.stack);
            }
            throw error;
        }
    },
});
