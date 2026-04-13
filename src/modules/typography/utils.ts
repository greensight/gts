import { FileStorage } from '../../classes/FileStorage';
import type { ITypographyValue } from '../../classes/TokenManager/types/figma';
import type { IResolveValue, ITypographyToken } from './types';
import type { IBreakpoints, IFontFamilyMap } from './typographyFromTokenManager/module';

const cssFileName = 'styles.module.css';
const moduleFileName = 'index.ts';
const typographyDataFileName = 'typography.ts';
const fontFamilyFallback = 'sans-serif';

export const formatCSSBlock = (selector: string, properties: string[]) => {
    if (!properties.length) return '';
    const indentedProps = properties.map(p => `    ${p}`).join('\n');
    return `${selector} {\n${indentedProps}\n}`;
};

export const getCSSVariableName = (name: string) => `--${name}`;

const resolveFontFamilyValue = (value: string | number, fontFamily: IFontFamilyMap): string | number => {
    if (typeof value !== 'string') return value;

    const mappedValue = fontFamily[value] ?? value;
    const normalizedValue = mappedValue.trim().toLowerCase();
    if (normalizedValue.endsWith(fontFamilyFallback)) return mappedValue;

    return `${mappedValue}, ${fontFamilyFallback}`;
};

const normalizeTypographyValue = (
    typography: Partial<ITypographyValue>,
    fontFamily: IFontFamilyMap
): Partial<ITypographyValue> => {
    if (typeof typography.fontFamily !== 'string') return typography;

    return {
        ...typography,
        fontFamily: resolveFontFamilyValue(typography.fontFamily, fontFamily) as string,
    };
};

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
    typography: Partial<ITypographyValue>,
    fontFamily: IFontFamilyMap
): Record<string, string | number> => {
    const cssProperties: Record<string, string | number> = {};

    Object.entries(typography).forEach(([key, value]) => {
        const resolvedValue = key === 'fontFamily' ? resolveFontFamilyValue(value, fontFamily) : value;
        // Преобразуем camelCase в kebab-case
        const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        cssProperties[cssKey] = resolvedValue;
    });

    return cssProperties;
};

export const getTypographyCSSArray = (token: IResolveValue, breakpoints: IBreakpoints, fontFamily: IFontFamilyMap) => {
    const breakpointKeys = Object.keys(token.breakpoints);
    const baseCSS = convertTypographyToCSSProperties(token.base, fontFamily);

    return breakpointKeys.reduce<{ breakpoint: number | null; css: Partial<ITypographyValue> }[]>(
        (acc, breakpointKey, i) => {
            const value = convertTypographyToCSSProperties(token.breakpoints[breakpointKey], fontFamily);
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
        return acc + `.typo-${key} { ${cssContent} }`;
    }, '');

export const buildTypographyCSSContent = (
    typographyTokens: ITypographyToken[],
    breakpoints: IBreakpoints,
    fontFamily: IFontFamilyMap
): string => {
    const template = typographyTokens.reduce<{
        base: Record<string, Partial<ITypographyValue>>;
        breakpoints: Record<string, Record<string, Partial<ITypographyValue>>>;
    }>(
        (acc, token) => {
            const cssArray = getTypographyCSSArray(token.value, breakpoints, fontFamily);
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

export const buildTSTypographyContent = (typographyTokens: ITypographyToken[]): string => {
    if (!typographyTokens.length) return '';

    return `import styles from './styles.module.css';
import { typography } from './typography';

type TypographyKeysType = keyof typeof typography;

const getTypographyClass = (typographyKey: TypographyKeysType) => styles[\`typo-\${typographyKey}\`];

export { typography, getTypographyClass, type TypographyKeysType };
`;
};

export const buildTSTypographyDataContent = (
    typographyTokens: ITypographyToken[],
    fontFamily: IFontFamilyMap
): string => {
    if (!typographyTokens.length) return '';

    const typographyObjectContent = typographyTokens
        .map(token => {
            const normalizedBase = normalizeTypographyValue(token.value.base, fontFamily);
            const normalizedBreakpoints = Object.entries(token.value.breakpoints).reduce<
                Record<string, Partial<ITypographyValue>>
            >(
                (acc, [breakpointKey, breakpointValue]) => ({
                    ...acc,
                    [breakpointKey]: normalizeTypographyValue(breakpointValue, fontFamily),
                }),
                {}
            );

            return (
                `    '${token.name}': {\n` +
                `        base: ${JSON.stringify(normalizedBase, null, 8).replace(/\n/g, '\n        ')},\n` +
                `        breakpoints: ${JSON.stringify(normalizedBreakpoints, null, 8).replace(/\n/g, '\n        ')}\n` +
                `    }`
            );
        })
        .join(',\n');

    return `const typography = {
${typographyObjectContent}
} as const;

export { typography };
`;
};

export const writeTypographyFiles = async ({
    indexTSContent,
    typographyTSContent,
    cssContent,
    dir,
}: {
    indexTSContent: string;
    typographyTSContent: string;
    cssContent: string;
    dir: string;
}) => {
    await FileStorage.delete(dir);

    const indexTSPromise = FileStorage.write(moduleFileName, indexTSContent, { directory: dir });
    const typographyTSPromise = FileStorage.write(typographyDataFileName, typographyTSContent, { directory: dir });
    const cssPromise = FileStorage.write(cssFileName, cssContent, { directory: dir });

    await Promise.all([indexTSPromise, typographyTSPromise, cssPromise]);
};

interface IGenerateTypographyFilesParams {
    typographyTokens: ITypographyToken[];
    dir: string;
    breakpoints: IBreakpoints;
    fontFamily: IFontFamilyMap;
}

export const generateTypographyFiles = async ({
    typographyTokens,
    dir,
    breakpoints,
    fontFamily,
}: IGenerateTypographyFilesParams) => {
    const cssContent = buildTypographyCSSContent(typographyTokens, breakpoints, fontFamily);
    const typographyTSContent = buildTSTypographyDataContent(typographyTokens, fontFamily);
    const indexTSContent = buildTSTypographyContent(typographyTokens);

    await writeTypographyFiles({ indexTSContent, typographyTSContent, cssContent, dir });
};
