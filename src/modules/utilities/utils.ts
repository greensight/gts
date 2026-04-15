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
 * Учитывает опциональные поля `output`: префикс переменных и класс обёртки.
 */
export const resolveUtilityNaming = (
    input: IUtilitiesInput,
    output: IUtilitiesOutput
): IUtilityNamingFromVariablePath => {
    const derived = deriveUtilityNamingFromVariablePath(input.variablePath);
    const variableNamePrefix = derived.variableNamePrefix;
    const variablesClassName = output.variablesClassName ?? `${variableNamePrefix}-variables`;

    return {
        variableNamePrefix,
        variablesClassName,
    };
};

/**
 * Полное имя CSS custom property без `--`.
 */
export const getUtilityCssVariableNameWithoutDashes = (
    variablePath: string,
    flatName: string
): string => `${deriveUtilityNamingFromVariablePath(variablePath).variableNamePrefix}-${flatName}`;

/**
 * Имя CSS custom property для токена (как в сгенерированном `styles.css`).
 */
export const getUtilityCssVariableName = (
    variablePath: string,
    flatName: string
): string => `--${getUtilityCssVariableNameWithoutDashes(variablePath, flatName)}`;

const withCssVariableDashes = (nameWithoutDashes: string): string => `--${nameWithoutDashes}`;

export const resolveUtilityCssVariableNameWithoutDashes = (
    input: IUtilitiesInput,
    output: IUtilitiesOutput,
    flatName: string
): string => {
    const defaultName = getUtilityCssVariableNameWithoutDashes(input.variablePath, flatName);
    if (!output.parseCssVariableName) {
        return defaultName;
    }

    const parsedName = output.parseCssVariableName({
        variablePath: input.variablePath,
        flatName,
        defaultName,
    });

    return parsedName.trim() ? parsedName : defaultName;
};

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
    input: IUtilitiesInput,
    output: IUtilitiesOutput
): { base: Record<string, string>; byBreakpoint: Record<number, Record<string, string>> } => {
    const { breakpoints } = input;
    const nameWithoutDashes = resolveUtilityCssVariableNameWithoutDashes(input, output, token.flatName);
    const varKey = withCssVariableDashes(nameWithoutDashes);
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
    input: IUtilitiesInput,
    output: IUtilitiesOutput
): IUtilityVarTemplate =>
    tokens.reduce<IUtilityVarTemplate>(
        (acc, token) => {
            const { base, byBreakpoint } = splitUtilityTokenForMedia(token, input, output);
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
export const buildUtilitiesGlobalStylesCSS = (
    tokens: IResolvedUtilityToken[],
    input: IUtilitiesInput,
    output: IUtilitiesOutput
): string => {
    if (!tokens.length) return '';

    const { variablesClassName } = resolveUtilityNaming(input, output);
    const template = buildUtilityVarTemplate(tokens, input, output);

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

const getDefaultUtilityKey = (flatName: string): string => {
    const segments = flatName
        .split('-')
        .map(segment => segment.trim())
        .filter(Boolean);
    return segments[segments.length - 1] ?? flatName;
};

const resolveUtilityKey = (input: IUtilitiesInput, output: IUtilitiesOutput, flatName: string): string => {
    const defaultKey = getDefaultUtilityKey(flatName);
    if (!output.parseUtilityKey) {
        return defaultKey;
    }

    const parsedKey = output.parseUtilityKey({
        variablePath: input.variablePath,
        flatName,
        defaultKey,
    });

    return parsedKey.trim() ? parsedKey : defaultKey;
};

const tsIdentifierPattern = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

const resolveUtilityKeysTypeName = (output: IUtilitiesOutput): string => {
    const rawName = output.utilityKeysTypeName?.trim();
    const typeName = rawName || 'UtilitiesKeysType';
    if (!tsIdentifierPattern.test(typeName)) {
        throw new Error(
            `Invalid utilityKeysTypeName: "${typeName}". Expected a valid TypeScript identifier.`
        );
    }

    return typeName;
};

const buildUtilityVariableNameMap = (
    tokens: IResolvedUtilityToken[],
    input: IUtilitiesInput,
    output: IUtilitiesOutput
): Record<string, string> =>
    tokens.reduce<Record<string, string>>((acc, token) => {
        const key = resolveUtilityKey(input, output, token.flatName);
        const existingFlatName = acc[key];
        if (existingFlatName && existingFlatName !== token.flatName) {
            throw new Error(
                `Utility key collision: "${key}" is generated for both "${existingFlatName}" and "${token.flatName}"`
            );
        }

        return {
            ...acc,
            [key]: token.flatName,
        };
    }, {});

/**
 * Содержимое index.ts: данные токенов и хелперы имён переменных (как в `styles.css`).
 */
export const buildUtilitiesIndexTSContent = (
    tokens: IResolvedUtilityToken[],
    input: IUtilitiesInput,
    output: IUtilitiesOutput
): string => {
    const flatNameByKey = buildUtilityVariableNameMap(tokens, input, output);
    const variableNameByKey = Object.keys(flatNameByKey).reduce<Record<string, string>>((acc, key) => {
        const flatName = flatNameByKey[key];
        return {
            ...acc,
            [key]: resolveUtilityCssVariableNameWithoutDashes(input, output, flatName),
        };
    }, {});
    const variableNameByKeyLiteral = JSON.stringify(variableNameByKey, null, 4);
    const rawHelperName = output.getUtilityCssVarFunctionName?.trim();
    const utilityCssVarFunctionName = rawHelperName || 'getUtilityCssVar';
    const utilityKeysTypeName = resolveUtilityKeysTypeName(output);

    return [
        `const utilityVariableNameByKey = ${variableNameByKeyLiteral} as const;`,
        ``,
        `type ${utilityKeysTypeName} = keyof typeof utilityVariableNameByKey;`,
        ``,
        `const getUtilityCssVariableName = (key: ${utilityKeysTypeName}): string =>`,
        `    \`--\${utilityVariableNameByKey[key]}\`;`,
        ``,
        `const ${utilityCssVarFunctionName} = (key: ${utilityKeysTypeName}): string =>`,
        `    \`var(\${getUtilityCssVariableName(key)})\`;`,
        ``,
        `export {`,
        `    getUtilityCssVariableName,`,
        `    ${utilityCssVarFunctionName},`,
        `    type ${utilityKeysTypeName},`,
        `};`,
        ``,
    ].join('\n');
};

const globalStylesFileName = 'styles.css';
const moduleFileName = 'index.ts';

export const writeUtilitiesFiles = async ({
    dir,
    globalCss,
    indexTs,
}: {
    dir: string;
    globalCss: string;
    indexTs: string;
}): Promise<void> => {
    await FileStorage.delete(dir);

    await Promise.all([
        FileStorage.write(globalStylesFileName, globalCss, { directory: dir }),
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
    const globalCss = buildUtilitiesGlobalStylesCSS(tokens, input, output);
    const indexTs = buildUtilitiesIndexTSContent(tokens, input, output);

    await writeUtilitiesFiles({ dir, globalCss, indexTs });
};
