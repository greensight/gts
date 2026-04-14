# Модуль: `containerFromTokenManager`

Строит токены контейнера из **grid-стилей** (`styles.grid`): для каждого числового брейкпоинта ищется элемент сетки с `pattern === 'columns'`, резолвится `offset` через `TokenManager`. Нулевые отступы и подряд идущие дубликаты по offset отфильтровываются.

**Исходный код:** `src/modules/container/containerFromTokenManager/module.ts`

## `input`

| Поле | Тип | Обязательность | По умолчанию | Описание |
|------|-----|----------------|--------------|----------|
| `layer` | `string \| undefined` | Опционально | — | Передаётся в генератор файлов как семантика слоя/обёртки (см. `generateContainerFiles`). |

**Ограничения:**

- Нужен загруженный `TokenManager` и наличие `styles.grid`.

## `output`

| Поле | Тип | Обязательность | Описание |
|------|-----|----------------|----------|
| `dir` | `string` | **Обязательно** | Каталог для сгенерированных файлов контейнера. |

## Пример

```typescript
containerFromTokenManager({
    input: { layer: 'layout' },
    output: { dir: './dist/container' },
})
```
