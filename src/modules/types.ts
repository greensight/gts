import type { FigmaAPI } from '../classes/FigmaApi';

export interface IModule {
    name: string;
    executor: ({ figmaApiClient }: { figmaApiClient: FigmaAPI }) => Promise<void>;
}
