import type { FigmaAPI } from '../classes/FigmaApi';

// import type { TokenVariables, ResolvedTokenFile } from '../classes/TokenManager';

export interface IModule {
    name: string;
    executor: ({
        figmaApiClient,
        // tokens,
    }: {
        figmaApiClient: FigmaAPI;
        // tokens?: {
        //     variables: TokenVariables;
        //     styles: {
        //         text?: ResolvedTokenFile;
        //         effect?: ResolvedTokenFile;
        //         color?: ResolvedTokenFile;
        //         grid?: ResolvedTokenFile;
        //     };
        // };
    }) => Promise<void>;
}
