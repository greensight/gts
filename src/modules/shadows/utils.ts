import { FileStorage } from '../../classes/FileStorage';
import type { IShadowValue } from '../../classes/TokenManager/types';
import type { IShadowToken } from './types';

export const formatCSSBlock = (selector: string, variables: string[]) => {
    if (!variables.length) return '';
    const indentedVars = variables.map(v => `    ${v}`).join('\n');
    return `${selector} {\n${indentedVars}\n}`;
};

export const formatModeClassName = (modeName: string) => `.${modeName.replace(/\s+/g, '-').toLowerCase()}`;

export const getVariableName = (name: string) => name.replaceAll(/ /g, '').split('/').at(-1) as string;
export const getCSSVariableName = (name: string) => `--${name}`;
export const getCSSVariableValue = ({ offsetX, offsetY, blur, spread, color }: IShadowValue) =>
    `${offsetX} ${offsetY} ${blur} ${spread} ${color}`;

export const buildShadowCSSVariables = (colorTokens: IShadowToken[]): Record<string, string[]> => {
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
export const buildShadowCSSContent = (cssVariables: Record<string, string[]>): string => {
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

export const buildShadowJSONContent = (shadowTokens: IShadowToken[]): string => {
    const jsonObject = shadowTokens.reduce((acc, s) => ({ ...acc, [s.name]: s.value }), {});
    return JSON.stringify(jsonObject);
};

export const writeShadowFiles = async (
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

interface IGenerateShadowFilesParams {
    shadowTokens: IShadowToken[];
    jsonDir: string;
    stylesDir: string;
    jsonFileName: string;
    cssFileName: string;
}

export const generateShadowFiles = async ({
    shadowTokens,
    jsonDir,
    stylesDir,
    jsonFileName,
    cssFileName,
}: IGenerateShadowFilesParams) => {
    const cssVariables = buildShadowCSSVariables(shadowTokens);
    const cssContent = buildShadowCSSContent(cssVariables);
    const jsonContent = buildShadowJSONContent(shadowTokens);

    await writeShadowFiles(jsonContent, cssContent, jsonDir, stylesDir, jsonFileName, cssFileName);
};
