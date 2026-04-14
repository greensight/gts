# Модуль: `utilitiesFromTokenManager`

Обходит поддерево **переменных** по пути `variablePath`, резолвит dimension-токены по режимам, опционально фильтрует по `include`, генерирует глобальные стили и утилиты (CSS/TS).

**Исходный код:** `src/modules/utilities/utilitiesFromTokenManager/module.ts`, типы — `src/modules/utilities/types.ts`

## `input`

| Поле | Тип | Обязательность | По умолчанию | Описание |
|------|-----|----------------|--------------|----------|
| `variablePath` | `string` | **Обязательно** | — | Путь в дереве `variables` (как в TokenManager), например `radius` или вложенный сегмент. Определяет поддерево для utility-токенов. |
| `breakpoints` | `Record<string, string>` | **Обязательно** | — | Соответствие имён режимов токенов логическим именам для медиа/режимов при генерации (тот же смысл, что в типографике). |
| `include` | `(string \| RegExp)[] \| undefined` | Опционально | — | Белый список по `flatName` сгенерированного токена: точное совпадение строки или `RegExp.test` по полному имени. Если не задан или пуст — попадают все dimension-листья под путём. |
| `variableNamePrefix` | `string \| undefined` | Опционально | последний сегмент `variablePath` | Префикс для CSS-переменных `--prefix-flatName` и `var(...)`. |
| `variablesClassName` | `string \| undefined` | Опционально | `` `${variableNamePrefix}-variables` `` | Имя класса-обёртки в глобальном `styles.css`. |

**Ограничения:**

- Нужен загруженный `TokenManager`.
- Если под путём нет подходящих dimension-токенов или фильтр `include` всё отсёк — генерация завершится с предупреждением без записи файлов.

## `output`

| Поле | Тип | Обязательность | Описание |
|------|-----|----------------|----------|
| `dir` | `string` | **Обязательно** | Каталог для `styles.css`, `utilities.ts`, `index.ts` и связанных артефактов модуля. |

## Пример

```typescript
utilitiesFromTokenManager({
    input: {
        variablePath: 'spacing',
        breakpoints: { sm: 'mobile', lg: 'desktop' },
        include: ['spacing-xs', /^spacing-[sm]$/],
        variableNamePrefix: 'spacing',
        variablesClassName: 'spacing-variables',
    },
    output: { dir: './dist/utilities' },
})
```
