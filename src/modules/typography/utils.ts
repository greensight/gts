import { FileStorage } from '../../classes/FileStorage';
import type { ITypographyValue } from '../../classes/TokenManager/types/figma';
import type { IResolveValue, ITypographyToken } from './types';
import type { IBreakpoints } from './typographyFromTokenManager/module';

export const formatCSSBlock = (selector: string, properties: string[]) => {
    if (!properties.length) return '';
    const indentedProps = properties.map(p => `    ${p}`).join('\n');
    return `${selector} {\n${indentedProps}\n}`;
};

export const getCSSVariableName = (name: string) => `--${name}`;

/**
 * Конвертирует объект ITypographyValue в объект с CSS-совместимыми ключами
 * @param typography - объект типографии из Figma
 * @returns объект с ключами в kebab-case формате
 *
 * @example
 * const typography = {
 *   fontFamily: 'Arial',
 *   fontSize: '16px',
 *   fontWeight: 400,
 *   letterSpacing: '0.5px',
 *   lineHeight: '1.5',
 *   textTransform: 'none',
 *   textDecoration: 'none'
 * };
 *
 * const cssProps = convertTypographyToCSSProperties(typography);
 * // Результат: {
 * //   'font-family': 'Arial',
 * //   'font-size': '16px',
 * //   'font-weight': 400,
 * //   'letter-spacing': '0.5px',
 * //   'line-height': '1.5',
 * //   'text-transform': 'none',
 * //   'text-decoration': 'none'
 * // }
 */
export const convertTypographyToCSSProperties = (
    typography: Partial<ITypographyValue>
): Record<string, string | number> => {
    const cssProperties: Record<string, string | number> = {};

    Object.entries(typography).forEach(([key, value]) => {
        // Преобразуем camelCase в kebab-case
        const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        cssProperties[cssKey] = value;
    });

    return cssProperties;
};

export const getTypographyCSSArray = (token: IResolveValue, breakpoints: IBreakpoints) => {
    const breakpointKeys = Object.keys(token.breakpoints);
    const baseCSS = convertTypographyToCSSProperties(token.base);

    return breakpointKeys.reduce<{ breakpoint: number | null; css: Partial<ITypographyValue> }[]>(
        (acc, breakpointKey, i) => {
            const value = convertTypographyToCSSProperties(token.breakpoints[breakpointKey]);
            if (!i)
                return [
                    {
                        breakpoint: null,
                        css: {
                            ...baseCSS,
                            ...value,
                        },
                    },
                ];
            return [...acc, { breakpoint: Number(breakpoints[breakpointKey]), css: value }];
        },
        [
            {
                breakpoint: null,
                css: baseCSS,
            },
        ]
    );
};

const getTypographyCSSString = (typogarphyData: Record<string, Partial<ITypographyValue>>) =>
    Object.keys(typogarphyData).reduce((acc, key) => {
        const typographyValue = typogarphyData[key];
        const cssContent = (Object.keys(typographyValue) as (keyof ITypographyValue)[])
            .map(k => `${k}: ${typographyValue[k]}`)
            .join(';');
        return acc + `.${key}Typography { ${cssContent} }`;
    }, '');

export const buildTypographyCSSContent = (typographyTokens: ITypographyToken[], breakpoints: IBreakpoints): string => {
    const template = typographyTokens.reduce<{
        base: Record<string, Partial<ITypographyValue>>;
        breakpoints: Record<string, Record<string, Partial<ITypographyValue>>>;
    }>(
        (acc, token) => {
            const cssArray = getTypographyCSSArray(token.value, breakpoints);
            cssArray.forEach(({ breakpoint, css }) => {
                if (!breakpoint) acc.base[token.name] = css;
                else {
                    if (!acc.breakpoints[breakpoint]) acc.breakpoints[breakpoint] = {};
                    acc.breakpoints[breakpoint][token.name] = css;
                }
            });
            return acc;
        },
        { base: {}, breakpoints: {} }
    );
    const baseCSS = getTypographyCSSString(template.base);

    const breakpointsCSS = Object.keys(template.breakpoints).reduce((acc, breakpoint) => {
        const breakpointTypography = template.breakpoints[breakpoint];
        return acc + `@media (max-width: ${breakpoint}px) { ${getTypographyCSSString(breakpointTypography)} }`;
    }, '');

    return baseCSS + breakpointsCSS;
};

export const buildJSONContent = (typographyTokens: ITypographyToken[]): string => {
    const jsonObject = typographyTokens.reduce((acc, t) => ({ ...acc, [t.name]: t.value }), {});
    return JSON.stringify(jsonObject);
};

export const writeTypographyFiles = async (
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

interface IGenerateTypographyFilesParams {
    typographyTokens: ITypographyToken[];
    jsonDir: string;
    stylesDir: string;
    jsonFileName: string;
    cssFileName: string;
    breakpoints: IBreakpoints;
    isModule?: boolean;
}

export const generateTypographyFiles = async ({
    typographyTokens,
    jsonDir,
    stylesDir,
    jsonFileName,
    cssFileName,
    breakpoints,
    isModule,
}: IGenerateTypographyFilesParams) => {
    const cssContent = buildTypographyCSSContent(typographyTokens, breakpoints);
    const jsonContent = buildJSONContent(typographyTokens);
    const fullCssFileName = `${cssFileName}${isModule ? '.module' : ''}.css`;
    const fullJsonFileName = `${jsonFileName}.json`;

    await writeTypographyFiles(jsonContent, cssContent, jsonDir, stylesDir, fullJsonFileName, fullCssFileName);
};
