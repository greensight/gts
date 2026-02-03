// Base token types
export type TFigmaTokenType = 'color' | 'dimension' | 'typography' | 'shadow' | 'grid' | 'string';

export interface IBaseFigmaToken {
    $type: TFigmaTokenType;
    $value: unknown;
    $description?: string;
}

export interface IColorFigmaGradientValue {
    type: 'radial' | 'linear' | 'conic';
    angle: number;
    stops: {
        color: string;
        position: number;
    }[];
}

// Specific FigmaToken value types
export interface IColorFigmaToken extends IBaseFigmaToken {
    $type: 'color';
    $value: string | IColorFigmaGradientValue;
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

export type TFigmaTokenValue = string | ITokenFile | TFigmaToken | ITypographyValue | IShadowValue[] | IGridValue[];

export type TFigmaToken =
    | IColorFigmaToken
    | IDimensionFigmaToken
    | TypographyFigmaToken
    | IShadowFigmaToken
    | IGridFigmaToken
    | IStringFigmaToken;

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
    [key: string]: TFigmaToken | ITokenFile;
}

// export interface IFigmaTokenStyles {
//     text?: IRawFigmaTokenFile;
//     effect?: IRawFigmaTokenFile;
//     color?: IRawFigmaTokenFile;
//     grid?: IRawFigmaTokenFile;
// }
