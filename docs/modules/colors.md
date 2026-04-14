# Модуль: `colorsFromTokenManager`

Генерирует файлы цветовых токенов из стилей (`styles.color`) и/или из выбранных групп переменных в `variables` по ключам из `includeVariables`. Значения ссылок резолвятся через `TokenManager`.

**Исходный код:** `src/modules/colors/colorsFromTokenManager/module.ts`

## `input`

| Поле | Тип | Обязательность | По умолчанию | Описание |
|------|-----|----------------|--------------|----------|
| `includeVariables` | `string[] \| undefined` | Опционально | — | Ключи верхнего уровня в объекте `variables` из `TokenManager.getVariables()`. Для каждого ключа подставляется соответствующее поддерево цветов. |
| `includeStyles` | `boolean \| undefined` | Опционально | `true` | Брать ли цвета из `styles.color`. |

**Ограничения:**

- Должно быть включено хотя бы одно: непустой `includeVariables` **или** `includeStyles === true`. Иначе выбрасывается ошибка: *Either includeVariables or includeStyles must be enabled*.
- Требуется загруженный `TokenManager` (`isLoaded()`).

## `output`

| Поле | Тип | Обязательность | Описание |
|------|-----|----------------|----------|
| `dir` | `string` | **Обязательно** | Каталог для сгенерированных файлов цветов. |

## Пример

```typescript
colorsFromTokenManager({
    input: {
        includeStyles: true,
        includeVariables: ['brand', 'semantic'],
    },
    output: { dir: './dist/colors' },
})
```
