import type { IBreakpoints } from '../typography/typographyFromTokenManager/module';

export type { IBreakpoints };

/**
 * Один «плоский» dimension-токен после обхода дерева variables и резолва ссылок по режимам.
 */
export interface IResolvedUtilityToken {
    flatName: string;
    /** ключ = имя режима (как в value токена), значение = итоговая CSS-строка (например длина) */
    resolvedByMode: Record<string, string>;
}

/**
 * Итоговые имена для глобального CSS: префикс переменных и класс обёртки с `--*`.
 */
export interface IUtilityNamingFromVariablePath {
    variablesClassName: string;
    variableNamePrefix: string;
}

/**
 * Вход: токены и семантика CSS (что резолвить из Figma и как трактовать в свойствах/переменных).
 */
export interface IUtilitiesInput {
    variablePath: string;
    breakpoints: IBreakpoints;
    /**
     * Белый список по `flatName` сгенерированного токена (например `radius-M`, `size-xxs`).
     * Строка — точное совпадение; RegExp — `test` по полному имени.
     * Если не задан или пустой — попадают все dimension-листья под `variablePath`.
     */
    include?: (string | RegExp)[];
}

/**
 * Выход: каталог артефактов (`styles.css`, `index.ts`) и опции имён CSS.
 */
export interface IUtilitiesOutput {
    dir: string;
    /** Класс обёртки в глобальном `styles.css`. Если не задан — `${lastSegment(variablePath)}-variables`. */
    variablesClassName?: string;
    /**
     * Кастомный парсер полного имени CSS custom property без `--`.
     * Позволяет переопределить нейминг переменных в `styles.css` и `index.ts`.
     * Если не задан — используется дефолтная стратегия `${lastSegment(variablePath)}-${flatName}`.
     */
    parseCssVariableName?: (params: {
        variablePath: string;
        flatName: string;
        defaultName: string;
    }) => string;
    /**
     * Кастомный парсер короткого utility-ключа для публичного API.
     * Если не задан — используется дефолтный ключ (последний сегмент `flatName` после `-`).
     */
    parseUtilityKey?: (params: {
        variablePath: string;
        flatName: string;
        defaultKey: string;
    }) => string;
    /**
     * Имя экспортируемой функции, которая возвращает `var(--...)` по utility-ключу.
     * Если не задано — `getUtilityCssVar`.
     */
    getUtilityCssVarFunctionName?: string;
    /**
     * Имя экспортируемого типа ключей utilities в сгенерированном `index.ts`.
     * Если не задано — `UtilitiesKeysType`.
     */
    utilityKeysTypeName?: string;
}

/**
 * `input` — данные токенов и семантика CSS; `output` — каталог вывода.
 */
export interface IUtilitiesFromTokenManagerParams {
    input: IUtilitiesInput;
    output: IUtilitiesOutput;
}
