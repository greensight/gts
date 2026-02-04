export const BREAKPOINTS_NAMES = ['xxxl', 'xxl', 'xl', 'lg', 'md', 'sm', 'xs', 'xxs', 'xxxs'];

export interface IBreakpointToken {
    name: string;
    value: string;
}

export interface IBreakpointListToken {
    name: string;
    value: string;
}

export type TBreakpointExtension = 'css' | 'scss';
