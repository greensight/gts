import { FileStorage } from '../../classes/FileStorage';
import type { TokenManager } from '../../classes/TokenManager';
import type { IDSTokenFile, IDSTokenVariable } from '../../classes/TokenManager/types';
import { get } from '../../common/lodash';
import { formatCSSBlock } from '../typography/utils';
import type {
    IBreakpoints,
    IResolvedUtilityToken,
    IUtilitiesInput,
    IUtilitiesOutput,
    IUtilityNamingFromVariablePath,
} from './types';

const isTokenVariableLeaf = (node: unknown): node is IDSTokenVariable =>
    typeof node === 'object' && node !== null && 'type' in node && 'value' in node;

const isVariablesRecord = (node: unknown): node is Record<string, unknown> =>
    typeof node === 'object' && node !== null && !Array.isArray(node);

const parseVariablePathToSegments = (variablePath: string): string[] =>
    variablePath
        .trim()
        .split('.')
        .map(segment => segment.trim())
        .filter(Boolean);

/**
 * Поддерево variables по пути — строка с сегментами через `.` (как в lodash.get).
 */
export const getVariablesSubtree = (variables: IDSTokenFile['variables'], variablePath: string): unknown => {
    const segments = parseVariablePathToSegments(variablePath);
    if (!segments.length) {
        throw new Error('variablePath must contain at least one segment');
    }

    const subtree = get(variables, segments);
    if (subtree === undefined) {
        throw new Error(`Variables subtree not found at path: ${segments.join('.')}`);
    }
    return subtree;
};

const walkUtilitiesSubtree = (
    node: unknown,
    namePrefix: string,
    tokenManager: TokenManager
): IResolvedUtilityToken[] => {
    if (!node) return [];

    if (isTokenVariableLeaf(node)) {
        if (node.type !== 'dimension') return [];

        const rawByMode = node.value as Record<string, string>;
        const resolvedByMode = Object.keys(rawByMode).reduce<Record<string, string>>((acc, mode) => {
            const raw = rawByMode[mode];
            const resolved = tokenManager.resolveVariableValueString(raw, mode);
            return { ...acc, [mode]: resolved ?? raw };
        }, {});

        return [{ flatName: namePrefix, resolvedByMode }];
    }

    if (!isVariablesRecord(node)) return [];

    return Object.keys(node).flatMap(key => {
        const child = node[key];
        const nextName = namePrefix ? `${namePrefix}-${key}` : key;
        return walkUtilitiesSubtree(child, nextName, tokenManager);
    });
};

/**
 * Обход дерева variables, только листья с type === 'dimension'; резолв ссылок по каждому режиму.
 */
export const resolveUtilitiesSubtree = (subtree: unknown, tokenManager: TokenManager): IResolvedUtilityToken[] =>
    walkUtilitiesSubtree(subtree, '', tokenManager);

/**
 * Проверка `flatName` против одного элемента белого списка.
 */
export const utilityFlatNameMatchesIncludePattern = (flatName: string, pattern: string | RegExp): boolean =>
    typeof pattern === 'string' ? flatName === pattern : pattern.test(flatName);

/**
 * Оставляет только токены, чей `flatName` совпадает хотя бы с одним шаблоном из `include`.
 */
export const filterResolvedUtilitiesByInclude = (
    tokens: IResolvedUtilityToken[],
    include: (string | RegExp)[] | undefined
): IResolvedUtilityToken[] => {
    if (!include?.length) {
        return tokens;
    }

    return tokens.filter(token =>
        include.some(pattern => utilityFlatNameMatchesIncludePattern(token.flatName, pattern))
    );
};

export interface ISortedBreakpointMode {
    mode: string;
    widthPx: number;
}

/**
 * Режимы из breakpoints, отсортированные по ширине по убыванию (широкий первый — база).
 */
export const getSortedBreakpointModes = (breakpoints: IBreakpoints): ISortedBreakpointMode[] =>
    Object.keys(breakpoints)
        .map(mode => ({ mode, widthPx: Number.parseInt(breakpoints[mode], 10) }))
        .filter(entry => Number.isFinite(entry.widthPx))
        .sort((a, b) => b.widthPx - a.widthPx);

/**
 * Последний сегмент variablePath задаёт дефолтные префиксы имён переменных и класс обёртки.
 */
export const deriveUtilityNamingFromVariablePath = (variablePath: string): IUtilityNamingFromVariablePath => {
    const segments = parseVariablePathToSegments(variablePath);
    if (!segments.length) {
        throw new Error('variablePath must contain at least one segment');
    }

    const base = segments[segments.length - 1];

    return {
        variablesClassName: `${base}-variables`,
        variableNamePrefix: base,
    };
};

/**
 * Учитывает опциональные поля `input`: префикс переменных и класс обёртки.
 */
export const resolveUtilityNaming = (input: IUtilitiesInput): IUtilityNamingFromVariablePath => {
    const derived = deriveUtilityNamingFromVariablePath(input.variablePath);
    const variableNamePrefix = input.variableNamePrefix ?? derived.variableNamePrefix;
    const variablesClassName = input.variablesClassName ?? `${variableNamePrefix}-variables`;

    return {
        variableNamePrefix,
        variablesClassName,
    };
};

/**
 * Имя CSS custom property для токена (как в сгенерированном `styles.css`).
 */
export const getUtilityCssVariableName = (variableNamePrefix: string, flatName: string): string =>
    variableNamePrefix ? `--${variableNamePrefix}-${flatName}` : `--${flatName}`;

const mergeBreakpointMaps = (
    a: Record<number, Record<string, string>>,
    b: Record<number, Record<string, string>>
): Record<number, Record<string, string>> =>
    Object.keys(b).reduce<Record<number, Record<string, string>>>(
        (acc, widthKey) => {
            const width = Number(widthKey);
            return { ...acc, [width]: { ...acc[width], ...b[width] } };
        },
        { ...a }
    );

/**
 * Делит значения токена на базу и переопределения для @media (max-width).
 */
export const splitUtilityTokenForMedia = (
    token: IResolvedUtilityToken,
    breakpoints: IBreakpoints,
    variableNamePrefix: string
): { base: Record<string, string>; byBreakpoint: Record<number, Record<string, string>> } => {
    const varKey = getUtilityCssVariableName(variableNamePrefix, token.flatName);
    const sortedModes = getSortedBreakpointModes(breakpoints);

    if (Object.keys(breakpoints).length === 0 || sortedModes.length === 0) {
        const firstVal = Object.values(token.resolvedByMode)[0] ?? '';
        return { base: { [varKey]: firstVal }, byBreakpoint: {} };
    }

    const modesWithValues = sortedModes.filter(entry => entry.mode in token.resolvedByMode);

    if (modesWithValues.length === 0) {
        const firstVal = Object.values(token.resolvedByMode)[0] ?? '';
        return { base: { [varKey]: firstVal }, byBreakpoint: {} };
    }

    if (modesWithValues.length === 1) {
        const only = modesWithValues[0];
        const val = token.resolvedByMode[only.mode] ?? '';
        return { base: { [varKey]: val }, byBreakpoint: {} };
    }

    const baseVal = token.resolvedByMode[modesWithValues[0].mode] ?? '';
    const byBreakpoint = modesWithValues.slice(1).reduce<Record<number, Record<string, string>>>((acc, current, i) => {
        const widerMode = modesWithValues[i].mode;
        const prevVal = token.resolvedByMode[widerMode];
        const currVal = token.resolvedByMode[current.mode];
        if (currVal === undefined || currVal === prevVal) return acc;

        const width = current.widthPx;
        const prev = acc[width] ?? {};
        return { ...acc, [width]: { ...prev, [varKey]: currVal } };
    }, {});

    return { base: { [varKey]: baseVal }, byBreakpoint };
};

interface IUtilityVarTemplate {
    base: Record<string, string>;
    breakpoints: Record<number, Record<string, string>>;
}

const buildUtilityVarTemplate = (
    tokens: IResolvedUtilityToken[],
    breakpoints: IBreakpoints,
    variableNamePrefix: string
): IUtilityVarTemplate =>
    tokens.reduce<IUtilityVarTemplate>(
        (acc, token) => {
            const { base, byBreakpoint } = splitUtilityTokenForMedia(token, breakpoints, variableNamePrefix);
            return {
                base: { ...acc.base, ...base },
                breakpoints: mergeBreakpointMaps(acc.breakpoints, byBreakpoint),
            };
        },
        { base: {}, breakpoints: {} }
    );

/**
 * Глобальный styles.css: класс-обёртка с CSS variables и вложенные @media (max-width), без медиа при ≤1 режиме или пустых breakpoints.
 */
export const buildUtilitiesGlobalStylesCSS = (tokens: IResolvedUtilityToken[], input: IUtilitiesInput): string => {
    if (!tokens.length) return '';

    const { breakpoints } = input;
    const { variablesClassName, variableNamePrefix } = resolveUtilityNaming(input);
    const template = buildUtilityVarTemplate(tokens, breakpoints, variableNamePrefix);

    const baseProps = Object.keys(template.base).map(key => `    ${key}: ${template.base[key]};`);
    const baseBlock = formatCSSBlock(`.${variablesClassName}`, baseProps);

    const mediaBlocks = Object.keys(template.breakpoints)
        .map(Number)
        .sort((a, b) => b - a)
        .map(width => {
            const props = template.breakpoints[width];
            const innerProps = Object.keys(props).map(key => `    ${key}: ${props[key]};`);
            const inner = formatCSSBlock(`.${variablesClassName}`, innerProps);
            return `@media (max-width: ${width}px) {\n${inner}\n}`;
        })
        .filter(Boolean)
        .join('\n\n');

    return mediaBlocks ? `${baseBlock}\n\n${mediaBlocks}` : baseBlock;
};

export interface IUtilitySerializableEntry {
    breakpoints: Record<string, string>;
}

/**
 * Данные для utilities.ts: все значения по режимам токена в `breakpoints` (без схлопывания совпадающих соседей).
 * Порядок ключей: режимы из `getSortedBreakpointModes` (широкий → узкий), присутствующие в токене;
 * затем остальные режимы в порядке `Object.keys(resolvedByMode)`.
 * Если конфиг `breakpoints` пуст или нет валидных ширин — порядок ключей как в `Object.keys(resolvedByMode)`.
 */
export const utilityTokenToSerializableData = (
    token: IResolvedUtilityToken,
    breakpoints: IBreakpoints
): IUtilitySerializableEntry => {
    const resolved = token.resolvedByMode;
    const sortedModes = getSortedBreakpointModes(breakpoints);
    const hasValidBreakpointWidths = Object.keys(breakpoints).length > 0 && sortedModes.length > 0;

    const modesOrder = (() => {
        if (!hasValidBreakpointWidths) {
            return Object.keys(resolved);
        }

        const ordered: string[] = [];
        const seen = new Set<string>();

        sortedModes.forEach(({ mode }) => {
            if (!(mode in resolved)) return;
            ordered.push(mode);
            seen.add(mode);
        });

        Object.keys(resolved).forEach(mode => {
            if (seen.has(mode)) return;
            ordered.push(mode);
            seen.add(mode);
        });

        return ordered;
    })();

    const breakpointsRecord = modesOrder.reduce<Record<string, string>>((acc, mode) => {
        const resolvedValue = resolved[mode];
        if (resolvedValue === undefined) {
            return acc;
        }
        return { ...acc, [mode]: resolvedValue };
    }, {});

    return { breakpoints: breakpointsRecord };
};

/**
 * Содержимое файла utilities.ts (объект + as const).
 */
export const buildUtilitiesDataTSContent = (tokens: IResolvedUtilityToken[], input: IUtilitiesInput): string => {
    const { breakpoints } = input;

    if (!tokens.length) {
        return `const utilities = {} as const;

export { utilities };
`;
    }

    const entries = tokens.map(token => {
        const data = utilityTokenToSerializableData(token, breakpoints);
        const json = JSON.stringify(data, null, 8);
        return `    '${token.flatName}': ${json.replace(/\n/g, '\n    ')}`;
    });

    return `const utilities = {
${entries.join(',\n')}
} as const;

export { utilities };
`;
};

/**
 * Содержимое index.ts: данные токенов и хелперы имён переменных (как в `styles.css`).
 */
export const buildUtilitiesIndexTSContent = (input: IUtilitiesInput): string => {
    const { variableNamePrefix } = resolveUtilityNaming(input);
    const prefixLiteral = JSON.stringify(variableNamePrefix);

    return [
        `import { utilities } from './utilities';`,
        ``,
        `type UtilitiesKeysType = keyof typeof utilities;`,
        ``,
        `const utilityVariableNamePrefix = ${prefixLiteral};`,
        ``,
        `const getUtilityCssVariableName = (key: UtilitiesKeysType): string =>`,
        `    utilityVariableNamePrefix`,
        `        ? \`--\${utilityVariableNamePrefix}-\${String(key)}\``,
        `        : \`--\${String(key)}\`;`,
        ``,
        `const getUtilityCssVar = (key: UtilitiesKeysType): string =>`,
        `    \`var(\${getUtilityCssVariableName(key)})\`;`,
        ``,
        `export {`,
        `    utilities,`,
        `    getUtilityCssVariableName,`,
        `    getUtilityCssVar,`,
        `    type UtilitiesKeysType,`,
        `};`,
        ``,
    ].join('\n');
};

const globalStylesFileName = 'styles.css';
const utilitiesDataFileName = 'utilities.ts';
const moduleFileName = 'index.ts';

export const writeUtilitiesFiles = async ({
    dir,
    globalCss,
    utilitiesTs,
    indexTs,
}: {
    dir: string;
    globalCss: string;
    utilitiesTs: string;
    indexTs: string;
}): Promise<void> => {
    await FileStorage.delete(dir);

    await Promise.all([
        FileStorage.write(globalStylesFileName, globalCss, { directory: dir }),
        FileStorage.write(utilitiesDataFileName, utilitiesTs, { directory: dir }),
        FileStorage.write(moduleFileName, indexTs, { directory: dir }),
    ]);
};

export const generateUtilitiesFiles = async ({
    tokens,
    input,
    output,
}: {
    tokens: IResolvedUtilityToken[];
    input: IUtilitiesInput;
    output: IUtilitiesOutput;
}): Promise<void> => {
    const { dir } = output;
    const globalCss = buildUtilitiesGlobalStylesCSS(tokens, input);
    const utilitiesTs = buildUtilitiesDataTSContent(tokens, input);
    const indexTs = buildUtilitiesIndexTSContent(input);

    await writeUtilitiesFiles({ dir, globalCss, utilitiesTs, indexTs });
};
