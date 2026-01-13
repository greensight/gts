import type { GetFileComponentsResponse, GetFileNodesResponse, GetFileStylesResponse } from '@figma/rest-api-spec';

import type { IConfig, OnTimeMeasureHandlerType } from './types';
import { chunkIds, preparedParams } from './utils';

export class FigmaAPI {
    figmaToken: string;
    fileId: string;
    constructor(figmaToken: string, fileId: string) {
        this.figmaToken = figmaToken;
        this.fileId = fileId;
    }

    private onTimeMeasureHandler?: OnTimeMeasureHandlerType;

    setOnTimeMeasureHandler(handler: OnTimeMeasureHandlerType) {
        this.onTimeMeasureHandler = handler;
    }

    static async returnJSON<T = unknown>(response: Response) {
        const json: any = await response.json();

        if (!response.ok) {
            let errorMessage = 'Request failed';

            throw new Error(errorMessage);
        }

        return json as T;
    }

    private async performControlledRequest(
        endpoint: string,
        { params = {}, timeout = 30000, abortController = new AbortController() }: IConfig = {}
    ) {
        const parsedParams = Object.entries(params).reduce((acc, [key, value]) => {
            if (typeof value !== 'undefined') return { ...acc, [key]: value };
            return acc;
        }, {});
        const endpoinWithParams = `https://api.figma.com/v1${endpoint}${parsedParams && Object.keys(parsedParams).length ? `?${preparedParams(parsedParams)}` : ''}`;
        console.log('endpoinWithParams=', endpoinWithParams);
        const timer = setTimeout(() => abortController.abort(), timeout);

        const headers = {
            'Content-Type': 'application/json',
            ...(this.figmaToken && { 'X-Figma-Token': this.figmaToken }),
        };

        const config = {
            method: 'GET',
            headers,
            signal: abortController.signal,
        };

        const time = performance.now();

        const response = await fetch(`${endpoinWithParams}`, config);
        clearTimeout(timer);

        const timeDeltaMs = performance.now() - time;
        this.onTimeMeasureHandler?.(endpoinWithParams, headers, timeDeltaMs);

        return response;
    }

    private async request<T = unknown, TData = unknown>(endpoint: string, config?: IConfig<TData>): Promise<T> {
        const resp = await this.performControlledRequest(endpoint, {
            ...config,
        });

        if (resp.headers.get('content-type')?.includes('application/json')) return FigmaAPI.returnJSON<T>(resp);

        return resp as T;
    }

    public async getComponents() {
        return this.request<GetFileComponentsResponse>(`/files/${this.fileId}/components`);
    }

    public async getStyles() {
        return this.request<GetFileStylesResponse>(`/files/${this.fileId}/styles`);
    }

    public async getNodes(ids: string[]) {
        const promises = chunkIds(ids).map(idsItem =>
            this.request<GetFileNodesResponse>(`/files/${this.fileId}/nodes`, { params: { ids: idsItem.join(',') } })
        );

        const responses = await Promise.all(promises);

        const response: GetFileNodesResponse = {
            ...responses[0],
            nodes: responses.reduce((acc, r) => ({ ...acc, ...r.nodes }), {}),
        };

        return response;
    }
}
