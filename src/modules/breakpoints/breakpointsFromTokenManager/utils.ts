import type { IBreakpointToken, TBreakpointExtension } from '../types';
import { deleteAndWriteFile, tokensToNumericObject } from '../utils';

export const formatCSSBlock = (selector: string, variables: string[]) => {
    if (!variables.length) return '';
    const indentedVars = variables.map(v => `    ${v}`).join('\n');
    return `${selector} {\n${indentedVars}\n}`;
};

export const formatSCSSVariables = (variables: string[]) => {
    if (!variables.length) return '';
    return variables.join('\n');
};

export const getCSSVariableName = (name: string) => `--${name}`;

export const getSCSSVariableName = (name: string) => `$${name}`;

export const buildCSSVariables = (breakpointTokens: IBreakpointToken[]): string[] => {
    return breakpointTokens.map(token => `${getCSSVariableName(token.name)}: ${token.value}px;`);
};

export const buildSCSSVariables = (breakpointTokens: IBreakpointToken[]): string[] => {
    return breakpointTokens.map(token => `${getSCSSVariableName(token.name)}: ${token.value}px;`);
};

export const buildCSSContent = (cssVariables: string[]): string => {
    return formatCSSBlock(':root', cssVariables);
};

export const buildSCSSContent = (scssVariables: string[]): string => {
    return formatSCSSVariables(scssVariables);
};

export const buildJSONContent = (breakpointTokens: IBreakpointToken[]): string => {
    const jsonObject = tokensToNumericObject(breakpointTokens);
    return JSON.stringify(jsonObject);
};

export const writeBreakpointFiles = async (
    jsonContent: string,
    cssContent: string | null,
    scssContent: string | null,
    jsonDir: string,
    stylesDir: string,
    jsonFileName: string,
    cssFileName: string | null,
    scssFileName: string | null
) => {
    const operations = [];

    operations.push(deleteAndWriteFile(jsonFileName, jsonContent, jsonDir));

    if (cssFileName && cssContent) {
        operations.push(deleteAndWriteFile(cssFileName, cssContent, stylesDir));
    }

    if (scssFileName && scssContent) {
        operations.push(deleteAndWriteFile(scssFileName, scssContent, stylesDir));
    }

    await Promise.all(operations);
};

interface IGenerateFilesParams {
    breakpointTokens: IBreakpointToken[];
    jsonDir: string;
    stylesDir: string;
    jsonFileName: string;
    stylesFileName: string;
    extensions: TBreakpointExtension[];
}

export const generateBreakpointFiles = async ({
    breakpointTokens,
    jsonDir,
    stylesDir,
    jsonFileName,
    stylesFileName,
    extensions,
}: IGenerateFilesParams) => {
    const cssVariables = buildCSSVariables(breakpointTokens);
    const scssVariables = buildSCSSVariables(breakpointTokens);

    const cssContent = extensions.includes('css') ? buildCSSContent(cssVariables) : null;
    const scssContent = extensions.includes('scss') ? buildSCSSContent(scssVariables) : null;

    const cssFileName = extensions.includes('css') ? `${stylesFileName}.css` : null;
    const scssFileName = extensions.includes('scss') ? `${stylesFileName}.scss` : null;

    const jsonContent = buildJSONContent(breakpointTokens);

    await writeBreakpointFiles(
        jsonContent,
        cssContent,
        scssContent,
        jsonDir,
        stylesDir,
        jsonFileName,
        cssFileName,
        scssFileName
    );
};
