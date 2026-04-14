# Модуль: `shadowsFromTokenManager`

Генерирует токены теней из **effect-стилей** (`styles.effect`), обходя вложенную структуру и собирая CSS-значения теней.

**Исходный код:** `src/modules/shadows/shadowsFromTokenManager.ts`

## `input`

| Поле | Тип | Обязательность | По умолчанию | Описание |
|------|-----|----------------|--------------|----------|
| `includeStyles` | `boolean \| undefined` | Опционально | `true` | Сейчас тени берутся только из стилей; при `false` выбрасывается ошибка: *includeStyles must be enabled for shadows generation*. |

**Ограничения:**

- Требуется загруженный `TokenManager` и наличие данных в `styles.effect` (иначе предупреждение и ранний выход без файлов).

## `output`

| Поле | Тип | Обязательность | Описание |
|------|-----|----------------|----------|
| `dir` | `string` | **Обязательно** | Каталог для сгенерированных файлов теней. |

## Пример

```typescript
shadowsFromTokenManager({
    input: { includeStyles: true },
    output: { dir: './dist/shadows' },
})
```
