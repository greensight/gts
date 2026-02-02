export type TShadowTokenValue = string | Record<string, string>;

export interface IShadowToken {
    name: string;
    value: TShadowTokenValue;
}
