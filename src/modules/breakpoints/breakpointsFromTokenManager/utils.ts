import type { IBreakpointToken } from '../types';
import { deleteAndWriteFile, tokensToNumericObject } from '../utils';

const buildCSSContent = (breakpointTokens: IBreakpointToken[]): string => {
    const variables = breakpointTokens.map(({ name, value }) => `    --${name}: ${value};`);

    if (!variables.length) {
        return '';
    }

    return `.breakpoint-variables {\n${variables.join('\n')}\n}\n`;
};

const buildSCSSContent = (breakpointTokens: IBreakpointToken[]): string => {
    const entries = breakpointTokens.map(({ name, value }) => `    ${name}: ${value}`);
    const defaultBreakpoint = breakpointTokens.at(-1)?.name;
    const sassScalars = breakpointTokens.map(({ name, value }) => `$${name}: ${value};`).join('\n');

    if (!entries.length || !defaultBreakpoint) {
        return '';
    }

    return `$breakpointList: (\n${entries.join(',\n')}\n);\n\n$defaultBreakpoint: '${defaultBreakpoint}';\n\n${sassScalars}\n`;
};

const buildIndexContent = (breakpoints: Record<string, number>): string => {
    return [
        `const breakpoints = ${JSON.stringify(breakpoints, null, 4)} as const;`,
        '',
        'const BREAKPOINTS_NAMES = Object.keys(breakpoints);',
        '',
        'type BreakpointsKeysType = keyof typeof breakpoints;',
        "type AllowMedia = 'all' | BreakpointsKeysType;",
        '',
        'export { breakpoints, BREAKPOINTS_NAMES };',
        'export type { BreakpointsKeysType, AllowMedia };',
        '',
    ].join('\n');
};

interface IGenerateFilesParams {
    breakpointTokens: IBreakpointToken[];
    dir: string;
}

export const generateBreakpointFiles = async ({ breakpointTokens, dir }: IGenerateFilesParams) => {
    const breakpoints = tokensToNumericObject(breakpointTokens);
    const cssContent = buildCSSContent(breakpointTokens);
    const scssContent = buildSCSSContent(breakpointTokens);
    const indexContent = buildIndexContent(breakpoints);

    await Promise.all([
        deleteAndWriteFile('styles.css', cssContent, dir),
        deleteAndWriteFile('styles.scss', scssContent, dir),
        deleteAndWriteFile('index.ts', indexContent, dir),
    ]);
};
