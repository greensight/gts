export type TColorTokenValue = string | Record<string, string>;

export interface IColorToken {
    name: string;
    value: TColorTokenValue;
}
