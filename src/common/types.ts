export enum ExtensionEnum {
    CSS = 'css',
    SCSS = 'scss',
    SASS = 'sass',
}

export interface IColorComponents {
    colorSpace: string;
    components: [number, number, number];
    alpha: number;
    hex: string;
}

export interface IFigmaVariable<T = unknown> {
    $type: string;
    $value: T;
    $extensions: {
        'com.figma.variableId': string;
        'com.figma.scopes': string[];
    };
}

export interface IFigmaVariablesBase {
    $extensions: {
        'com.figma.modeName': string;
    };
}

export interface IFigmaVariablesMap {
    [key: string]: IFigmaVariable<IColorComponents>;
}

export type IFigmaColorVariables = IFigmaVariablesBase & IFigmaVariablesMap;
