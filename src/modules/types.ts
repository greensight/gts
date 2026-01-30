import type { FigmaAPI } from '../classes/FigmaApi';
import type { TokenManager } from '../classes/TokenManager';

// import type { TokenVariables, ResolvedTokenFile } from '../classes/TokenManager';

export interface IModule {
    name: string;
    executor: ({
        figmaApiClient,
        tokenManagerClient,
    }: {
        figmaApiClient: FigmaAPI;
        tokenManagerClient: TokenManager;
    }) => Promise<void>;
}
