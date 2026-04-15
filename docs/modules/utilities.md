# Модуль: `utilitiesFromTokenManager`

Обходит поддерево **переменных** по пути `variablePath`, резолвит dimension-токены по режимам, опционально фильтрует по `include`, генерирует глобальные стили и утилиты (CSS/TS).

**Исходный код:** `src/modules/utilities/utilitiesFromTokenManager/module.ts`, типы — `src/modules/utilities/types.ts`

## `input`

| Поле           | Тип                                 | Обязательность  | По умолчанию | Описание                                                                                                                                                                           |
| -------------- | ----------------------------------- | --------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `variablePath` | `string`                            | **Обязательно** | —            | Путь в дереве `variables` (как в TokenManager), например `radius` или вложенный сегмент. Определяет поддерево для utility-токенов.                                                 |
| `breakpoints`  | `Record<string, string>`            | **Обязательно** | —            | Соответствие имён режимов токенов логическим именам для медиа/режимов при генерации (тот же смысл, что в типографике).                                                             |
| `include`      | `(string \| RegExp)[] \| undefined` | Опционально     | —            | Белый список по `flatName` сгенерированного токена: точное совпадение строки или `RegExp.test` по полному имени. Если не задан или пуст — попадают все dimension-листья под путём. |

**Ограничения:**

- Нужен загруженный `TokenManager`.
- Если под путём нет подходящих dimension-токенов или фильтр `include` всё отсёк — генерация завершится с предупреждением без записи файлов.

## `output`

| Поле                   | Тип                                                                                                  | Обязательность  | По умолчанию                                   | Описание                                                                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------------- | --------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dir`                  | `string`                                                                                             | **Обязательно** | —                                              | Каталог для `styles.css`, `index.ts` и связанных артефактов модуля.                                                                               |
| `variablesClassName`   | `string \| undefined`                                                                                | Опционально     | `` `${lastSegment(variablePath)}-variables` `` | Имя класса-обёртки в глобальном `styles.css`.                                                                                                     |
| `parseCssVariableName` | `((params: { variablePath: string; flatName: string; defaultName: string }) => string) \| undefined` | Опционально     | —                                              | Кастомный парсер нейминга CSS custom property. Должен возвращать имя **без** `--`. Используется для генерации ключей в `styles.css` и `index.ts`. |
| `parseUtilityKey`      | `((params: { variablePath: string; flatName: string; defaultKey: string }) => string) \| undefined`  | Опционально     | —                                              | Кастомный парсер короткого ключа utility для `UtilitiesKeysType` в `index.ts`. Если возвращает пустую строку — используется `defaultKey`.        |
| `getUtilityCssVarFunctionName` | `string \| undefined`                                                                         | Опционально     | `getUtilityCssVar`                             | Имя экспортируемой функции-хелпера, которая возвращает `var(--...)` для utility-ключа.                                                            |
| `utilityKeysTypeName`  | `string \| undefined`                                                                                | Опционально     | `UtilitiesKeysType`                            | Имя экспортируемого типа ключей utilities в сгенерированном `index.ts`. Должно быть валидным TypeScript-идентификатором.                         |

## Пример

```typescript
utilitiesFromTokenManager({
    input: {
        variablePath: 'spacing',
        breakpoints: { sm: 'mobile', lg: 'desktop' },
        include: ['spacing-xs', /^spacing-[sm]$/],
    },
    output: {
        dir: './dist/utilities',
        variablesClassName: 'spacing-variables',
        utilityKeysTypeName: 'SpacingUtilityKey',
        getUtilityCssVarFunctionName: 'utilityVar',
        parseCssVariableName: ({ variablePath, flatName, defaultName }) => {
            const variablePathPrefix = variablePath
                .split('.')
                .map(segment => segment.trim())
                .filter(Boolean)
                .join('-');

            if (!variablePathPrefix) {
                return defaultName;
            }

            return `${variablePathPrefix}-${flatName}`;
        },
        parseUtilityKey: ({ flatName, defaultKey }) => {
            const segments = flatName.split('-').filter(Boolean);
            const shortKey = segments[segments.length - 1];
            return shortKey ?? defaultKey;
        },
    },
});
```
