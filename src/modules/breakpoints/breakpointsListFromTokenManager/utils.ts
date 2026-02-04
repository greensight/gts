import type { IBreakpointToken } from '../types';
import { tokensToNumericObject, deleteAndWriteFile } from '../utils';

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

export const writeBreakpointListFiles = async (scssContent: string, stylesDir: string, scssFileName: string) => {
    await deleteAndWriteFile(scssFileName, scssContent, stylesDir);
};

export const generateBreakpointListFiles = async ({
    breakpointTokens,
    stylesDir,
    scssFileName,
}: {
    breakpointTokens: IBreakpointToken[];
    stylesDir: string;
    scssFileName: string;
}) => {
    const scssContent = buildSCSSMapContent(breakpointTokens);
    await writeBreakpointListFiles(scssContent, stylesDir, scssFileName);
};