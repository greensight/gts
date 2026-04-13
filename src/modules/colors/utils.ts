import { FileStorage } from '../../classes/FileStorage';
import type { IColorToken } from './types';

const cssFileName = 'styles.css';
const moduleFileName = 'index.ts';

export const formatCSSBlock = (selector: string, variables: string[]) => {
    if (!variables.length) return '';
    const indentedVars = variables.map(v => `    ${v}`).join('\n');
    return `${selector} {\n${indentedVars}\n}`;
};

export const formatModeClassName = (modeName: string) => `.${modeName.replace(/\s+/g, '-').toLowerCase()}`;

export const getVariableName = (name: string) => name.replaceAll(/ /g, '').split('/').at(-1) as string;
export const getCSSVariableName = (name: string) => `--cl-${name}`;

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
    const rootBlock = formatCSSBlock('.color-variables', cssVariables.root);
    const modeBlocks = Object.entries(cssVariables)
        .reduce<string[]>((acc, [modeName, variables]) => {
            if (modeName === 'root' || !variables.length) return acc;
            const block = formatCSSBlock(formatModeClassName(`${modeName}-color-variables`), variables);
            if (block) acc.push(block);
            return acc;
        }, [])
        .join('\n\n');

    return [rootBlock, modeBlocks].filter(Boolean).join('\n\n');
};

export const buildTSColorsContent = (colorTokens: IColorToken[]): string => {
    const colorsObjectContent = colorTokens
        .map(c => `    '${c.name}': 'var(${getCSSVariableName(c.name)})'`)
        .join(',\n');
    const colorsObject = `const colors = {\n${colorsObjectContent}\n} as const;`;

    return `${colorsObject}\n\ntype ColorsKeysType = keyof typeof colors;\n\nexport { colors, type ColorsKeysType };\n`;
};

export const writeColorFiles = async ({
    tsContent,
    cssContent,
    dir,
}: {
    tsContent: string;
    cssContent: string;
    dir: string;
}) => {
    await FileStorage.delete(dir);

    const tsPromise = FileStorage.write(moduleFileName, tsContent, { directory: dir });
    const cssPromise = FileStorage.write(cssFileName, cssContent, { directory: dir });

    await Promise.all([tsPromise, cssPromise]);
};

interface IGenerateFilesParams {
    colorTokens: IColorToken[];
    dir: string;
}

export const generateColorFiles = async ({ colorTokens, dir }: IGenerateFilesParams) => {
    const cssVariables = buildCSSVariables(colorTokens);
    const cssContent = buildCSSContent(cssVariables);
    const tsContent = buildTSColorsContent(colorTokens);

    await writeColorFiles({ tsContent, cssContent, dir });
};
