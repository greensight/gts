import type { IBreakpointToken } from '../types';
import { deleteAndWriteFile, tokensToNumericObject } from '../utils';

export const buildSCSSMapContent = (breakpointTokens: IBreakpointToken[]): string => {
    const numericValues = tokensToNumericObject(breakpointTokens);
    const mapEntries = Object.entries(numericValues)
        .map(([name, value]) => `    ${name}: ${value}`)
        .join(',\n');

    const defaultBreakpoint = breakpointTokens.length > 0 ? breakpointTokens[breakpointTokens.length - 1].name : 'xxxl';

    return `$breakpointList: (
${mapEntries}
);
$defaultBreakpoint: '${defaultBreakpoint}';`;
};

export const writeBreakpointListFiles = async (scssContent: string, stylesDir: string, fileName: string) => {
    await deleteAndWriteFile(fileName, scssContent, stylesDir);
};

export const generateBreakpointListFiles = async ({
    breakpointTokens,
    stylesDir,
    fileName,
}: {
    breakpointTokens: IBreakpointToken[];
    stylesDir: string;
    fileName: string;
}) => {
    const scssContent = buildSCSSMapContent(breakpointTokens);
    await writeBreakpointListFiles(scssContent, stylesDir, `${fileName}.scss`);
};
