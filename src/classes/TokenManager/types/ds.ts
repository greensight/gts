import type { TFigmaToken, TFigmaTokenType } from './figma';

export type TDSTokenValue<T extends TFigmaTokenType> = Extract<TFigmaToken, { $type: T }>['$value'];
export type TDSTokenValueWithModes = Record<string, TDSTokenValue<TFigmaTokenType>>;

export interface IDSTokenVariable {
    type: TFigmaTokenType;
    value: TDSTokenValueWithModes;
    description?: string;
}

export type TDSTokenVariablesValue = Record<string, IDSTokenVariable> | IDSTokenVariable;
export interface IDSTokens {
    [group: string]: TDSTokenVariablesValue | IDSTokens;
}

export interface IDSStyles {
    text?: IDSTokens;
    effect?: IDSTokens;
    color?: IDSTokens;
    grid?: IDSTokens;
}

export interface IDSTokenFile {
    variables: IDSTokens;
    styles: IDSStyles;
}
