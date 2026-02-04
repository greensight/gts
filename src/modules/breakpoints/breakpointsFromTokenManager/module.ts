import type { IModule } from '../../types';
import { BREAKPOINTS_NAMES } from '../types';
import type { IBreakpointToken, TBreakpointExtension } from '../types';
import { generateBreakpointFiles } from './utils';

export interface IBreakpointsFromTokenManagerInput {
    extensions?: TBreakpointExtension[];
    names?: string[];
}

export interface IBreakpointsFromTokenManagerOutput {
    jsonDir: string;
    stylesDir: string;
    jsonFileName?: string;
    stylesFileName?: string;
}

export interface IBreakpointsFromTokenManagerParams {
    input?: IBreakpointsFromTokenManagerInput;
    output: IBreakpointsFromTokenManagerOutput;
}

/**
 * Extracts breakpoints from grid styles tokens and maps them to names
 */
const extractBreakpointsFromGrid = (gridStyles: Record<string, any>, names: string[]): IBreakpointToken[] => {
    const sortedBreakpoints = Object.keys(gridStyles)
        .filter(key => !isNaN(Number(key)))
        .sort((a, b) => Number(a) - Number(b));

    // Validate that we have enough names for all breakpoints
    if (sortedBreakpoints.length > names.length) {
        throw new Error(
            `Not enough breakpoint names provided. Found ${sortedBreakpoints.length} breakpoints in data, but only ${names.length} names specified: ${names.join(', ')}`
        );
    }

    // Check for invalid keys
    const allKeys = Object.keys(gridStyles);
    const invalidKeys = allKeys.filter(key => isNaN(Number(key)));

    if (invalidKeys.length > 0) {
        throw new Error(
            `Found non-numeric breakpoint keys in grid data: ${invalidKeys.join(', ')}. All breakpoint keys must be numeric values.`
        );
    }

    return sortedBreakpoints.map((key, index) => ({
        name: names[names.length - 1 - index] || `bp-${key}`,
        value: key,
    }));
};

export const breakpointsFromTokenManager = ({
    input = {},
    output: { jsonDir, stylesDir, jsonFileName = 'breakpoints.json', stylesFileName = 'breakpoints' },
}: IBreakpointsFromTokenManagerParams): IModule => ({
    name: 'breakpoints/tokenManager',
    executor: async ({ tokenManagerClient }) => {
        try {
            console.log(`[breakpoints/tokenManager] Generating breakpoints from TokenManager...`);

            const { extensions = ['css'], names = BREAKPOINTS_NAMES } = input;

            // Check if TokenManager has loaded tokens
            if (!tokenManagerClient.isLoaded()) {
                throw new Error('TokenManager is not loaded. Tokens must be loaded before using this module.');
            }

            // Get grid styles
            const styles = tokenManagerClient.getStyles();
            if (!styles.grid) {
                throw new Error('No grid styles found in TokenManager. Grid tokens must be loaded.');
            }

            console.log(`[breakpoints/tokenManager] Extracting breakpoints from grid styles...`);

            // Extract breakpoints from grid
            const breakpointTokens = extractBreakpointsFromGrid(styles.grid, names);

            if (!breakpointTokens.length) {
                console.warn(`[breakpoints/tokenManager] No breakpoints found in grid styles.`);
                return;
            }

            console.log(
                `[breakpoints/tokenManager] Found ${breakpointTokens.length} breakpoints: ${breakpointTokens.map(bp => bp.name).join(', ')}`
            );

            // Generate files
            await generateBreakpointFiles({
                breakpointTokens,
                jsonDir,
                stylesDir,
                jsonFileName,
                stylesFileName,
                extensions,
            });

            console.log(`[breakpoints/tokenManager] Breakpoints generated successfully.`);
        } catch (error) {
            console.error(`[breakpoints/tokenManager] Error:`, error);
            throw error;
        }
    },
});
