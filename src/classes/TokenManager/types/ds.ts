import type { TFigmaToken, TFigmaTokenType } from './figma';

export type TDSTokenValue<T extends TFigmaTokenType> = Extract<TFigmaToken, { $type: T }>['$value'];

export type IDSTokenVariableValue = string;
export type TDSTokenVariableValueWithModes = Record<string, IDSTokenVariableValue>;

export interface IBaseToken<V, T> {
    type: T;
    value: V;
    description?: string;
}

export interface IDSTokenVariable extends IBaseToken<
    TDSTokenVariableValueWithModes,
    'color' | 'dimension' | 'string'
> {}

export interface IDSTokenStyleColor extends IBaseToken<TDSTokenValue<'color'>, 'color'> {}
export interface IDSTokenStyleShadow extends IBaseToken<TDSTokenValue<'shadow'>, 'shadow'> {}
export interface IDSTokenStyleTypography extends IBaseToken<TDSTokenValue<'typography'>, 'typography'> {}
export interface IDSTokenStyleGrid extends IBaseToken<TDSTokenValue<'grid'>, 'grid'> {}

export type TDSTokenVariablesValue<TTokenValue> = Record<string, TTokenValue> | TTokenValue;
export interface IDSTokens<V> {
    [group: string]: V | IDSTokens<V>;
}

export interface IDSStyles {
    color: IDSTokens<IDSTokenStyleColor>;
    effect: IDSTokens<IDSTokenStyleShadow>;
    text: IDSTokens<IDSTokenStyleTypography>;
    grid: IDSTokens<IDSTokenStyleGrid>;
}

export interface IDSTokenFile {
    variables: IDSTokens<IDSTokenVariable>;
    styles: IDSStyles;
}
