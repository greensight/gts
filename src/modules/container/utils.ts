import { FileStorage } from '../../classes/FileStorage';
import type { IContainerToken } from './types';

export const formatCSSBlock = (selector: string, rules: string[]) => {
    if (!rules.length) return '';
    const indentedRules = rules.map(rule => `    ${rule}`).join('\n');
    return `${selector} {\n${indentedRules}\n}`;
};

export const formatMediaQuery = (breakpointValue: number, rules: string[]): string => {
    if (!rules.length) return '';
    const maxWidthValue = breakpointValue - 1;
    const indentedRules = rules.map(rule => `        ${rule}`).join('\n');
    return `@media (max-width: ${maxWidthValue}px) {\n${indentedRules}\n    }`;
};

export const buildContainerCSS = (containerTokens: IContainerToken[], layer?: string): string => {
    const cssBlocks: string[] = [];

    // Generate responsive rules based on container tokens
    containerTokens.forEach((token, index) => {
        const breakpointValue = parseInt(token.name.split('_')[0]); // Extract breakpoint from name
        const rules: string[] = [];
        const prevToken = index > 0 ? containerTokens[index - 1] : null;

        if (token.value.alignment === 'center' && token.value.width) {
            rules.push(`max-width: ${token.value.width};`);
            rules.push('margin-left: auto;');
            rules.push('margin-right: auto;');

            if (prevToken && prevToken.value.alignment !== 'center') {
                rules.push('padding-left: 0;');
                rules.push('padding-right: 0;');
            }
        }

        if (token.value.alignment === 'stretch' && prevToken && prevToken.value.alignment !== 'stretch') {
            rules.push('max-width: none;');
            rules.push('margin-left: 0;');
            rules.push('margin-right: 0;');
        }

        if (token.value.alignment === 'stretch') {
            rules.push(`padding-left: ${token.value.margin};`);
            rules.push(`padding-right: ${token.value.margin};`);
        }

        if (rules.length > 0) {
            const selector = '.container';
            const cssBlock = formatCSSBlock(selector, rules);

            // First breakpoint (largest) doesn't need media query
            if (index === 0) {
                cssBlocks.push(cssBlock);
            } else {
                const mediaQuery = formatMediaQuery(breakpointValue, [cssBlock]);
                cssBlocks.push(mediaQuery);
            }
        }
    });

    const allCSS = cssBlocks.filter(Boolean).join('\n\n');

    const css = allCSS.replace(/^/gm, '    ');
    const layerName = layer || 'components';
    return `@layer ${layerName} {\n${css}\n}`;
};

export const writeContainerFile = async (content: string, stylesDir: string, fileName: string) => {
    await deleteAndWriteFile(fileName, content, stylesDir);
};

export const deleteAndWriteFile = async (fileName: string, content: string, directory: string) => {
    await FileStorage.delete(fileName, directory);
    await FileStorage.write(fileName, content, { directory });
};

interface IGenerateContainerFilesParams {
    containerTokens: IContainerToken[];
    stylesDir: string;
    fileName: string;
    layer?: string;
    isModule?: boolean;
}

export const generateContainerFiles = async ({
    containerTokens,
    stylesDir,
    fileName,
    layer,
    isModule = true,
}: IGenerateContainerFilesParams) => {
    const content = buildContainerCSS(containerTokens, layer);
    const fullFileName = `${fileName}${isModule ? '.module' : ''}.css`;

    await writeContainerFile(content, stylesDir, fullFileName);
};
