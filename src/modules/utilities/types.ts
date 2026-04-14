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
 * Выход: каталог артефактов (`styles.css`, `utilities.ts`, `index.ts`) и опции имён CSS.
 */
export interface IUtilitiesOutput {
    dir: string;
    /**
     * Из `input.variablePath` получает префикс для `--prefix-flatName` и `var(...)`.
     * Если не задан — последний сегмент пути.
     */
    parseVariableName?: (variablePath: string) => string;
    /** Класс обёртки в глобальном `styles.css`. Если не задан — `${prefix}-variables`, где prefix из `parseVariableName`/дефолта. */
    variablesClassName?: string;
}

/**
 * `input` — данные токенов и семантика CSS; `output` — каталог вывода.
 */
export interface IUtilitiesFromTokenManagerParams {
    input: IUtilitiesInput;
    output: IUtilitiesOutput;
}
