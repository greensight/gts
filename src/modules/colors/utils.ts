import { FileStorage } from '../../classes/FileStorage';
import type { IColorToken } from './types';

export const formatCSSBlock = (selector: string, variables: string[]) => {
    if (!variables.length) return '';
    const indentedVars = variables.map(v => `    ${v}`).join('\n');
    return `${selector} {\n${indentedVars}\n}`;
};

export const formatModeClassName = (modeName: string) => `.${modeName.replace(/\s+/g, '-').toLowerCase()}`;

export const getVariableName = (name: string) => name.replaceAll(/ /g, '').split('/').at(-1) as string;
export const getCSSVariableName = (name: string) => `--${name}`;

export const buildCSSVariables = (colorTokens: IColorToken[]): Record<string, string[]> => {
    return colorTokens.reduce<Record<string, string[]>>(
        (acc, c) => {
            const name = getCSSVariableName(c.name);

            if (typeof c.value === 'object') {
                Object.entries(c.value).forEach(([modeName, value]) => {
                    if (!acc[modeName]) acc[modeName] = [];
                    acc[modeName].push(`${name}: ${value};`);
                });
            } else {
                acc.root.push(`${name}: ${c.value};`);
            }

            return acc;
        },
        { root: [] }
    );
};

export const buildCSSContent = (cssVariables: Record<string, string[]>): string => {
    const rootBlock = formatCSSBlock(':root', cssVariables.root);
    const modeBlocks = Object.entries(cssVariables)
        .reduce<string[]>((acc, [modeName, variables]) => {
            if (modeName === 'root' || !variables.length) return acc;
            const block = formatCSSBlock(formatModeClassName(modeName), variables);
            if (block) acc.push(block);
            return acc;
        }, [])
        .join('\n\n');

    return [rootBlock, modeBlocks].filter(Boolean).join('\n\n');
};

export const buildJSONContent = (colorTokens: IColorToken[]): string => {
    const jsonObject = colorTokens.reduce((acc, c) => ({ ...acc, [c.name]: c.value }), {});
    return JSON.stringify(jsonObject);
};

export const writeColorFiles = async (
    jsonContent: string,
    cssContent: string,
    jsonDir: string,
    stylesDir: string,
    jsonFileName: string,
    cssFileName: string
) => {
    await Promise.all([FileStorage.delete(jsonFileName, jsonDir), FileStorage.delete(cssFileName, stylesDir)]);

    const jsonPromise = FileStorage.write(jsonFileName, jsonContent, { directory: jsonDir });
    const cssPromise = FileStorage.write(cssFileName, cssContent, { directory: stylesDir });

    await Promise.all([jsonPromise, cssPromise]);
};

interface IGenerateFilesParams {
    colorTokens: IColorToken[];
    jsonDir: string;
    stylesDir: string;
    jsonFileName: string;
    cssFileName: string;
}

export const generateColorFiles = async ({
    colorTokens,
    jsonDir,
    stylesDir,
    jsonFileName,
    cssFileName,
}: IGenerateFilesParams) => {
    const cssVariables = buildCSSVariables(colorTokens);
    const cssContent = buildCSSContent(cssVariables);
    const jsonContent = buildJSONContent(colorTokens);

    await writeColorFiles(jsonContent, cssContent, jsonDir, stylesDir, jsonFileName, cssFileName);
};
