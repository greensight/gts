import type { IDSTokenStyleTypography } from '../../classes/TokenManager/types';

export interface IResolveValue {
    base: Partial<IDSTokenStyleTypography['value']>;
    breakpoints: Record<string, Partial<IDSTokenStyleTypography['value']>>;
}

export interface ITypographyToken {
    name: string;
    value: IResolveValue;
}
