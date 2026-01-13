// interface IColorBase {
//     name: string;
// }
// export interface ISimpleColor extends IColorBase {
//     value: string;
// }

// export interface IModeColor {
//     modeName: string;
//     value: string;
// }

// export interface IGroupColor extends IColorBase {
//     colors: IModeColor[];
// }

export interface IColorToken {
    name: string;
    value: string | Record<string, string>;
}
