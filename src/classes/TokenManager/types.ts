// Base token types
export type TFigmaTokenType = 'color' | 'dimension' | 'typography' | 'shadow' | 'grid' | 'string';

export interface IBaseFigmaToken {
    $type: TFigmaTokenType;
    $value: unknown;
    $description?: string;
}

// Specific FigmaToken value types
export interface IColorFigmaToken extends IBaseFigmaToken {
    $type: 'color';
    $value: string;
}

export interface IDimensionFigmaToken extends IBaseFigmaToken {
    $type: 'dimension';
    $value: string;
}

export interface IStringFigmaToken extends IBaseFigmaToken {
    $type: 'string';
    $value: string;
}

export interface ITypographyValue {
    fontFamily: string;
    fontSize: string;
    fontWeight: number;
    letterSpacing: string;
    lineHeight: string;
    textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
    textDecoration: 'none' | 'underline' | 'line-through';
}

export interface TypographyFigmaToken extends IBaseFigmaToken {
    $type: 'typography';
    $value: ITypographyValue;
}

export interface IShadowValue {
    offsetX: string;
    offsetY: string;
    blur: string;
    spread: string;
    color: string;
    inset?: boolean;
}

export interface IShadowFigmaToken extends IBaseFigmaToken {
    $type: 'shadow';
    $value: IShadowValue[];
}

export interface IGridValue {
    pattern: 'columns' | 'rows';
    visible: boolean;
    alignment: 'stretch' | 'center' | 'start' | 'end';
    color: string;
    gutterSize: string;
    count: number;
    offset: string;
}

export interface IGridFigmaToken extends IBaseFigmaToken {
    $type: 'grid';
    $value: IGridValue[];
}

export type TDesignFigmaToken =
    | IColorFigmaToken
    | IDimensionFigmaToken
    | TypographyFigmaToken
    | IShadowFigmaToken
    | IGridFigmaToken
    | IStringFigmaToken;

export interface IFigmaTokenCollection {
    [key: string]: TDesignFigmaToken | IFigmaTokenCollection;
}

export interface IModeFiles {
    [modeName: string]: string[];
}

export interface ICollection {
    modes: IModeFiles;
}

export interface ICollections {
    [collectionName: string]: ICollection;
}

export interface IFigmaStyles {
    text?: string[];
    effect?: string[];
    color?: string[];
    grid?: string[];
}

export interface IManifest {
    name: string;
    collections: ICollections;
    styles?: IFigmaStyles;
}

// Token file structure
export interface ITokenFile {
    [key: string]: TDesignFigmaToken | ITokenFile;
}

// Utility types for extracting values
export type ExtractTokenValue<T extends TDesignFigmaToken> = T['$value'];

export type TColorValue = ExtractTokenValue<IColorFigmaToken>;
export type TDimensionValue = ExtractTokenValue<IDimensionFigmaToken>;
export type TTypographyValue = ExtractTokenValue<TypographyFigmaToken>;
export type TShadowValue = ExtractTokenValue<IShadowFigmaToken>;
export type TGridValue = ExtractTokenValue<IGridFigmaToken>;
export type TStringValue = ExtractTokenValue<IStringFigmaToken>;

// Token variables and resolution
export type TTokenValue = TColorValue | TDimensionValue | TTypographyValue | TShadowValue | TGridValue | TStringValue;
export type TTokenModes = Record<string, TDesignFigmaToken>;

export interface IFigmaTokenVariables {
    [subgroup: string]: Record<
        string,
        TDesignFigmaToken | TTokenModes | Record<string, TDesignFigmaToken | TTokenModes>
    >;
}

export interface IFigmaTokenResolutionOptions {
    defaultMode?: string;
    modePriority?: string[];
}

// Styles loading and resolution
export interface ResolvedTokenFile {
    [key: string]: TDesignFigmaToken | ResolvedTokenFile;
}

// Raw styles with references (not resolved)
export interface IRawFigmaTokenFile {
    [key: string]: TDesignFigmaToken | IRawFigmaTokenFile;
}

export interface IFigmaTokenStyles {
    text?: IRawFigmaTokenFile;
    effect?: IRawFigmaTokenFile;
    color?: IRawFigmaTokenFile;
    grid?: IRawFigmaTokenFile;
}
// Type guards
export const isIColorToken = (token: TDesignFigmaToken): token is IColorFigmaToken => token.$type === 'color';

export const isIDimensionToken = (token: TDesignFigmaToken): token is IDimensionFigmaToken =>
    token.$type === 'dimension';

export const isTypographyToken = (token: TDesignFigmaToken): token is TypographyFigmaToken =>
    token.$type === 'typography';

export const isIShadowToken = (token: TDesignFigmaToken): token is IShadowFigmaToken => token.$type === 'shadow';

export const isIGridToken = (token: TDesignFigmaToken): token is IGridFigmaToken => token.$type === 'grid';

export const isStringToken = (token: TDesignFigmaToken): token is IStringFigmaToken => token.$type === 'string';
