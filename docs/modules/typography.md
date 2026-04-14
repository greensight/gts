# Модуль: `typographyFromTokenManager`

Генерирует типографику из **text-стилей** (`styles.text`), резолвит значения по режимам согласно карте `breakpoints` и опционально подставляет семейства шрифтов из `fontFamily`.

**Исходный код:** `src/modules/typography/typographyFromTokenManager/module.ts`

## `input`

| Поле | Тип | Обязательность | По умолчанию | Описание |
|------|-----|----------------|--------------|----------|
| `breakpoints` | `Record<string, string>` | **Обязательно** | — | Ключ — имя режима в токенах, значение — логическое имя для резолва (передаётся в `resolveVariableValueString(..., mode)`). Может быть пустым объектом — тогда используется базовое разрешение без пер-режимных веток. |
| `fontFamily` | `Record<string, string> \| undefined` | Опционально | `{}` | Карта подстановки семейств шрифтов при генерации файлов. |
| `fluid` | `boolean \| undefined` | Опционально | `true` | Флаг «fluid» типографики при вызове `generateTypographyFiles`. |

**Ограничения:**

- Нужен загруженный `TokenManager` и данные в `styles.text`.

## `output`

| Поле | Тип | Обязательность | Описание |
|------|-----|----------------|----------|
| `dir` | `string` | **Обязательно** | Каталог для сгенерированных файлов типографики. |

## Пример

```typescript
typographyFromTokenManager({
    input: {
        breakpoints: {
            mobile: 'mobile',
            tablet: 'tablet',
            desktop: 'desktop',
        },
        fontFamily: { sans: 'Inter, sans-serif' },
        fluid: true,
    },
    output: { dir: './dist/typography' },
})
```
