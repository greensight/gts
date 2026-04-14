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

interface ITypographyCSSTemplate {
    base: Record<string, Partial<ITypographyValue>>;
    breakpoints: Record<number, Record<string, Partial<ITypographyValue>>>;
}

const createTypographyCSSTemplate = (): ITypographyCSSTemplate => ({
    base: {},
    breakpoints: {},
});

const addBreakpointTypography = (
    template: ITypographyCSSTemplate,
    breakpoint: number,
    tokenName: string,
    css: Partial<ITypographyValue>
) => {
    if (!Object.keys(css).length) return;
    if (!template.breakpoints[breakpoint]) template.breakpoints[breakpoint] = {};
    template.breakpoints[breakpoint][tokenName] = {
        ...template.breakpoints[breakpoint][tokenName],
        ...css,
    };
};

const addDefaultTokenToTemplate = (
    template: ITypographyCSSTemplate,
    token: ITypographyToken,
    breakpoints: IBreakpoints,
    fontFamily: IFontFamilyMap
) => {
    const cssArray = getTypographyCSSArray(token.value, breakpoints, fontFamily);
    cssArray.forEach(({ breakpoint, css }) => {
        if (breakpoint === null) {
            template.base[token.name] = css;
            return;
        }

        addBreakpointTypography(template, breakpoint, token.name, css);
    });
};

const buildTypographyCSSFromTemplate = (template: ITypographyCSSTemplate): string => {
    const baseCSS = getTypographyCSSString(template.base);
    const breakpointsCSS = Object.keys(template.breakpoints)
        .map(Number)
        .sort((a, b) => b - a)
        .reduce((acc, breakpoint) => {
            const breakpointTypography = template.breakpoints[breakpoint];
            return acc + `@media (max-width: ${breakpoint}px) { ${getTypographyCSSString(breakpointTypography)} }`;
        }, '');

    return baseCSS + breakpointsCSS;
};

const buildDefaultTypographyCSSContent = (
    typographyTokens: ITypographyToken[],
    breakpoints: IBreakpoints,
    fontFamily: IFontFamilyMap
): string => {
    const template = typographyTokens.reduce<ITypographyCSSTemplate>((acc, token) => {
        addDefaultTokenToTemplate(acc, token, breakpoints, fontFamily);
        return acc;
    }, createTypographyCSSTemplate());

    return buildTypographyCSSFromTemplate(template);
};

const getTypographyCSSString = (typogarphyData: Record<string, Partial<ITypographyValue>>) =>
    Object.keys(typogarphyData).reduce((acc, key) => {
        const typographyValue = typogarphyData[key];
        const cssContent = (Object.keys(typographyValue) as (keyof ITypographyValue)[])
            .map(k => `${k}: ${typographyValue[k]}`)
            .join(';');
        return acc + `.typo-${key} { ${cssContent} }`;
    }, '');

const parseNumber = (value: string | number): number | null => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;

    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const parseToRem = (value: string | number): number | null => {
    if (typeof value === 'number') return value / 16;

    const normalized = value.trim().toLowerCase();
    if (normalized.endsWith('rem')) return parseNumber(normalized);
    if (normalized.endsWith('px')) {
        const px = parseNumber(normalized);
        return px === null ? null : px / 16;
    }

    return null;
};

const buildFluidPropertyValue = (params: {
    minValueRem: number;
    maxValueRem: number;
    minVwRem: number;
    maxVwRem: number;
}): string => {
    const { minValueRem, maxValueRem, minVwRem, maxVwRem } = params;
    const valueDiff = maxValueRem - minValueRem;

    return `calc(${minValueRem}rem + ((100vw - ${minVwRem}rem) / (${maxVwRem}rem - ${minVwRem}rem)) * ${valueDiff}rem)`;
};

const addFluidTokenToTemplate = (
    template: ITypographyCSSTemplate,
    token: ITypographyToken,
    breakpoints: IBreakpoints,
    fontFamily: IFontFamilyMap
): void => {
    const fluidPropertyKeys = ['font-size', 'line-height'] as const;
    const breakpointEntries = Object.entries(token.value.breakpoints)
        .map(([breakpointName, typography]) => {
            const width = Number.parseInt(breakpoints[breakpointName], 10);
            return { breakpointName, width, typography };
        })
        .filter(entry => Number.isFinite(entry.width))
        .sort((a, b) => b.width - a.width);

    if (breakpointEntries.length < 2) {
        addDefaultTokenToTemplate(template, token, breakpoints, fontFamily);
        return;
    }

    const desktopEntry = breakpointEntries[0];
    const mobileEntry = breakpointEntries[breakpointEntries.length - 1];

    if (desktopEntry.width <= mobileEntry.width) {
        addDefaultTokenToTemplate(template, token, breakpoints, fontFamily);
        return;
    }

    const baseCSS = convertTypographyToCSSProperties(token.value.base, fontFamily);
    const desktopCSS = convertTypographyToCSSProperties(desktopEntry.typography, fontFamily);
    const mobileCSS = convertTypographyToCSSProperties(mobileEntry.typography, fontFamily);
    const maxVwRem = desktopEntry.width / 16;
    const minVwRem = mobileEntry.width / 16;
    if (maxVwRem === minVwRem) {
        addDefaultTokenToTemplate(template, token, breakpoints, fontFamily);
        return;
    }

    template.base[token.name] = {
        ...baseCSS,
        ...desktopCSS,
    };

    const fluidProperties = fluidPropertyKeys.reduce<Partial<ITypographyValue>>((acc, propertyKey) => {
        const desktopRaw = desktopCSS[propertyKey];
        const mobileRaw = mobileCSS[propertyKey];
        if (desktopRaw === undefined || mobileRaw === undefined || desktopRaw === mobileRaw) {
            return acc;
        }

        const maxValueRem = parseToRem(desktopRaw);
        const minValueRem = parseToRem(mobileRaw);
        if (maxValueRem === null || minValueRem === null) return acc;

        return {
            ...acc,
            [propertyKey]: buildFluidPropertyValue({ minValueRem, maxValueRem, minVwRem, maxVwRem }),
        };
    }, {});
    addBreakpointTypography(template, desktopEntry.width, token.name, fluidProperties);

    addBreakpointTypography(template, mobileEntry.width, token.name, mobileCSS);
};

export const buildTypographyCSSContent = (
    typographyTokens: ITypographyToken[],
    breakpoints: IBreakpoints,
    fontFamily: IFontFamilyMap,
    fluid: boolean
): string => {
    if (!fluid) return buildDefaultTypographyCSSContent(typographyTokens, breakpoints, fontFamily);

    const template = typographyTokens.reduce<ITypographyCSSTemplate>((acc, token) => {
        addFluidTokenToTemplate(acc, token, breakpoints, fontFamily);
        return acc;
    }, createTypographyCSSTemplate());

    return buildTypographyCSSFromTemplate(template);
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
    fluid: boolean;
}

export const generateTypographyFiles = async ({
    typographyTokens,
    dir,
    breakpoints,
    fontFamily,
    fluid,
}: IGenerateTypographyFilesParams) => {
    const cssContent = buildTypographyCSSContent(typographyTokens, breakpoints, fontFamily, fluid);
    const typographyTSContent = buildTSTypographyDataContent(typographyTokens, fontFamily);
    const indexTSContent = buildTSTypographyContent(typographyTokens);

    await writeTypographyFiles({ indexTSContent, typographyTSContent, cssContent, dir });
};
