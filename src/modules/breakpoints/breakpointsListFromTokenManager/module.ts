import type { IModule } from '../../types';
import { BREAKPOINTS_NAMES } from '../types';
import type { IBreakpointToken } from '../types';
import { generateBreakpointListFiles } from './utils';

export interface IBreakpointListFromTokenManagerInput {
    names?: string[];
}

export interface IBreakpointListFromTokenManagerOutput {
    stylesDir: string;
    scssFileName?: string;
}

export interface IBreakpointListFromTokenManagerParams {
    input?: IBreakpointListFromTokenManagerInput;
    output: IBreakpointListFromTokenManagerOutput;
}

/**
 * Extracts breakpoints from grid styles tokens and maps them to names for SCSS map
 */
const extractBreakpointsForMap = (gridStyles: Record<string, any>, names: string[]): IBreakpointToken[] => {
    const sortedBreakpoints = Object.keys(gridStyles)
        .filter(key => !isNaN(Number(key)))
        .sort((a, b) => Number(a) - Number(b));

    // Validate that we have enough names for all breakpoints
    if (sortedBreakpoints.length > names.length) {
        throw new Error(
            `Not enough breakpoint names provided. Found ${sortedBreakpoints.length} breakpoints in data, but only ${names.length} names specified: ${names.join(', ')}`
        );
    }

    return sortedBreakpoints.map((key, index) => ({
        name: names[names.length - 1 - index] || `bp-${key}`,
        value: key,
    }));
};

export const breakpointsListFromTokenManager = ({
    input = {},
    output: { stylesDir, scssFileName = 'breakpointList.scss' },
}: IBreakpointListFromTokenManagerParams): IModule => ({
    name: 'breakpointsList/tokenManager',
    executor: async ({ tokenManagerClient }) => {
        try {
            console.log(`[breakpointsList/tokenManager] Generating SCSS breakpoint map...`);

            const { names = BREAKPOINTS_NAMES } = input;

            // Check if TokenManager has loaded tokens
            if (!tokenManagerClient.isLoaded()) {
                throw new Error('TokenManager is not loaded. Tokens must be loaded before using this module.');
            }

            // Get grid styles
            const styles = tokenManagerClient.getStyles();
            if (!styles.grid) {
                throw new Error('No grid styles found in TokenManager. Grid tokens must be loaded.');
            }

            console.log(`[breakpointsList/tokenManager] Extracting breakpoints for SCSS map...`);

            // Extract breakpoints for map
            const breakpointTokens = extractBreakpointsForMap(styles.grid, names);

            if (!breakpointTokens.length) {
                console.warn(`[breakpointsList/tokenManager] No breakpoints found in grid styles.`);
                return;
            }

            console.log(
                `[breakpointsList/tokenManager] Found ${breakpointTokens.length} breakpoints for map: ${breakpointTokens.map(bp => bp.name).join(', ')}`
            );

            // Generate SCSS map file
            await generateBreakpointListFiles({
                breakpointTokens,
                stylesDir,
                scssFileName,
            });

            console.log(`[breakpointsList/tokenManager] SCSS breakpoint map generated successfully.`);
        } catch (error) {
            console.error(`[breakpointsList/tokenManager] Error:`, error);
            throw error;
        }
    },
});
