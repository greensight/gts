import type { ColorStop, GradientPaint, Paint, Vector } from '@figma/rest-api-spec';

import { FileStorage } from '../../classes/FileStorage';
import { IColorFigmaGradientValue, IColorFigmaToken, IDSTokenStyleColor } from '../../classes/TokenManager/types';
import type { IColorToken } from './types';

export const rgbToHex = ({ r, g, b }: { r: number; g: number; b: number }) => {
    const numToHex = (num: number) => `0${num.toString(16)}`.slice(-2);
    return `#${numToHex(r)}${numToHex(g)}${numToHex(b)}`;
};

export const getSolidColor = ({ opacity, r, g, b }: { opacity: number; r: number; g: number; b: number }) => {
    const rgb = [r, g, b].map(num => Math.round(num * 255));
    return opacity < 1
        ? `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${opacity})`
        : rgbToHex({ r: rgb[0], g: rgb[1], b: rgb[2] });
};

export const getAngelDeg = (gradientHandlePositions: Vector[], adjustemntDeg = 0) => {
    const angleRad = Math.atan2(
        gradientHandlePositions[1].y - gradientHandlePositions[0].y,
        gradientHandlePositions[1].x - gradientHandlePositions[0].x
    );

    return Math.round((angleRad * 180) / Math.PI) + adjustemntDeg;
};

export const getMappedColors = (gradientStops: ColorStop[]) =>
    gradientStops
        .reduce<string[]>((acc, item) => {
            const position = Number((item.position * 100).toFixed(1));

            return [
                ...acc,
                `${getSolidColor({
                    opacity: item.color.a,
                    r: item.color.r,
                    g: item.color.g,
                    b: item.color.b,
                })}${position > 0 && position < 100 ? ` ${position}%` : ''}`,
            ];
        }, [])
        .join(', ');

export const getGradientCenterCoordinates = (gradientHandlePositions: Vector[]) => {
    // Coordinates of the center position
    const x0 = gradientHandlePositions[0].x;
    const y0 = gradientHandlePositions[0].y;

    const centerX = (x0 * 100).toFixed(2);
    const centerY = (y0 * 100).toFixed(2);

    return { centerX, centerY };
};

export const getGradientLinerColor = (paint: GradientPaint) => {
    const { gradientHandlePositions, gradientStops } = paint;

    const angleDeg = getAngelDeg(gradientHandlePositions, 90);

    const colorString = getMappedColors(gradientStops);

    return `linear-gradient(${angleDeg}deg, ${colorString})`;
};

export const getGradientRadius = (gradientHandlePositions: Vector[]) => {
    // Coordinates of the center position
    const x0 = gradientHandlePositions[0].x;
    const y0 = gradientHandlePositions[0].y;

    // Coordinates of the radius of a circle
    const x1 = gradientHandlePositions[1].x;
    const y1 = gradientHandlePositions[1].y;
    // Coordinates of a point stretching a circle
    const x2 = gradientHandlePositions[2].x;
    const y2 = gradientHandlePositions[2].y;

    const radiusX = (Math.sqrt((x2 - x0) ** 2 + (y2 - y0) ** 2) * 100).toFixed(2);
    const radiusY = (Math.sqrt((x1 - x0) ** 2 + (y1 - y0) ** 2) * 100).toFixed(2);

    return { radiusX, radiusY };
};

export const getGradientRadial = (paint: GradientPaint) => {
    const { gradientHandlePositions, gradientStops } = paint;

    const { centerX, centerY } = getGradientCenterCoordinates(gradientHandlePositions);
    const { radiusX, radiusY } = getGradientRadius(gradientHandlePositions);
    const colorString = getMappedColors(gradientStops);

    return `radial-gradient(${radiusX}% ${radiusY}% at ${centerX}% ${centerY}%, ${colorString})`;
};

export const getGradientAnugular = (paint: GradientPaint) => {
    const { gradientHandlePositions, gradientStops } = paint;

    const angleDeg = getAngelDeg(gradientHandlePositions, 30);

    const { centerX, centerY } = getGradientCenterCoordinates(gradientHandlePositions);
    const colorString = getMappedColors(gradientStops);

    return `conic-gradient(from ${angleDeg}deg at ${centerX}% ${centerY}%, ${colorString})`;
};

export const paintToColorToken = (paint: Paint) => {
    const type = paint.type;

    if (type === 'SOLID')
        return getSolidColor({
            opacity: paint.color.a,
            r: paint.color.r,
            g: paint.color.g,
            b: paint.color.b,
        });

    if (type === 'GRADIENT_LINEAR') return getGradientLinerColor(paint);
    if (type === 'GRADIENT_RADIAL') return getGradientRadial(paint);
    if (type === 'GRADIENT_ANGULAR') return getGradientAnugular(paint);

    return '';
};

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
