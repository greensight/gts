import { FileStorage } from '../../classes/FileStorage';
import type { IShadowValue } from '../../classes/TokenManager/types';
import type { IShadowToken } from './types';

const cssFileName = 'styles.css';
const moduleFileName = 'index.ts';

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

export const buildShadowCSSVariables = (shadowTokens: IShadowToken[]): Record<string, string[]> =>
    shadowTokens.reduce<Record<string, string[]>>(
        (acc, token) => {
            const cssVariableName = getCSSVariableName(token.name);

            if (typeof token.value !== 'object') {
                acc.root.push(`${cssVariableName}: ${token.value};`);
                return acc;
            }

            return Object.entries(token.value).reduce<Record<string, string[]>>((modeAcc, [modeName, value]) => {
                const modeVariables = modeAcc[modeName] ?? [];
                return { ...modeAcc, [modeName]: [...modeVariables, `${cssVariableName}: ${value};`] };
            }, acc);
        },
        { root: [] }
    );

export const buildShadowCSSContent = (cssVariables: Record<string, string[]>): string => {
    const rootBlock = formatCSSBlock('.shadow-variables', cssVariables.root);
    const modeBlocks = Object.entries(cssVariables)
        .reduce<string[]>((acc, [modeName, variables]) => {
            if (modeName === 'root' || !variables.length) return acc;
            const block = formatCSSBlock(formatModeClassName(`${modeName}-shadow-variables`), variables);
            if (block) acc.push(block);
            return acc;
        }, [])
        .join('\n\n');

    return [rootBlock, modeBlocks].filter(Boolean).join('\n\n');
};

export const buildTSShadowsContent = (shadowTokens: IShadowToken[]): string => {
    const shadowsObjectContent = shadowTokens.map(s => `    '${s.name}': 'var(${getCSSVariableName(s.name)})'`).join(',\n');
    const shadowsObject = `const shadows = {\n${shadowsObjectContent}\n} as const;`;

    return `${shadowsObject}\n\ntype ShadowsKeysType = keyof typeof shadows;\n\nexport { shadows, type ShadowsKeysType };\n`;
};

export const writeShadowFiles = async ({
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

interface IGenerateShadowFilesParams {
    shadowTokens: IShadowToken[];
    dir: string;
}

export const generateShadowFiles = async ({ shadowTokens, dir }: IGenerateShadowFilesParams) => {
    const cssVariables = buildShadowCSSVariables(shadowTokens);
    const cssContent = buildShadowCSSContent(cssVariables);
    const tsContent = buildTSShadowsContent(shadowTokens);

    await writeShadowFiles({ tsContent, cssContent, dir });
};
