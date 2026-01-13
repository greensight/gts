export interface IConfig<TParams = any> {
    params?: TParams;
    timeout?: number;
    abortController?: AbortController;
}

export type OnTimeMeasureHandlerType = (
    endpoint: string,
    headers: Record<string, unknown>,
    deltaTimeMs: number
) => void;
