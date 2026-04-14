import type { IModule } from '../../types';
import type { IUtilitiesFromTokenManagerParams } from '../types';
import {
    filterResolvedUtilitiesByInclude,
    generateUtilitiesFiles,
    getVariablesSubtree,
    resolveUtilitiesSubtree,
} from '../utils';

export const utilitiesFromTokenManager = ({ input, output }: IUtilitiesFromTokenManagerParams): IModule => ({
    name: 'utilities/tokenManager',
    executor: async ({ tokenManagerClient }) => {
        try {
            console.log(`[utilities/tokenManager] Generating utility classes from TokenManager...`);

            if (!tokenManagerClient.isLoaded()) {
                throw new Error('TokenManager is not loaded. Tokens must be loaded before using this module.');
            }

            const variables = tokenManagerClient.getVariables();
            const subtree = getVariablesSubtree(variables, input.variablePath);
            const resolved = resolveUtilitiesSubtree(subtree, tokenManagerClient);
            const tokens = filterResolvedUtilitiesByInclude(resolved, input.include);

            if (!tokens.length) {
                if (resolved.length && input.include?.length) {
                    console.warn(
                        `[utilities/tokenManager] No tokens left after include filter (${resolved.length} at path "${input.variablePath}")`
                    );
                } else {
                    console.warn(`[utilities/tokenManager] No dimension tokens found at path "${input.variablePath}"`);
                }
                return;
            }

            console.log(`[utilities/tokenManager] Resolved ${tokens.length} utility token(s)`);
            console.log(`[utilities/tokenManager] Writing files to ${output.dir}...`);

            await generateUtilitiesFiles({ tokens, input, output });

            console.log(`[utilities/tokenManager] ✅ Successfully generated utility files`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[utilities/tokenManager] ❌ Failed to generate utilities:`, errorMessage);
            if (error instanceof Error && error.stack) {
                console.error(`[utilities/tokenManager] Stack trace:`, error.stack);
            }
            throw error;
        }
    },
});
