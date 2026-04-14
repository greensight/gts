# Документация @greensight/gts

**Greensight Token System** — генерация дизайн-токенов и артефактов (CSS, TS) из JSON, загружаемых через `TokenManager` по `manifest.json` (экспорт токенов из Figma / DTCG-подобные файлы).

`TokenManager` рассчитан на каталог с `manifest.json` и JSON-файлами, полученными при экспорте плагином Figma **[Design Tokens Manager](https://www.figma.com/community/plugin/1263743870981744253/design-tokens-manager)**.

## Содержание

| Раздел | Описание |
|--------|----------|
| [Конфигурация](configuration.md) | Поля `gts.config.ts` (`IGtsConfig`), `manifest`, токены Figma |
| [Архитектура и поток данных](architecture.md) | Диаграмма: конфиг → `generate` → `TokenManager` → модули |
| [Модули: цвета](modules/colors.md) | `colorsFromTokenManager` |
| [Модули: брейкпоинты](modules/breakpoints.md) | `breakpointsFromTokenManager` |
| [Модули: контейнер](modules/container.md) | `containerFromTokenManager` |
| [Модули: тени](modules/shadows.md) | `shadowsFromTokenManager` |
| [Модули: типографика](modules/typography.md) | `typographyFromTokenManager` |
| [Модули: утилиты](modules/utilities.md) | `utilitiesFromTokenManager` |

## Установка

```bash
npm install --save-dev @greensight/gts
# или
pnpm add -D @greensight/gts
```

## CLI

После установки пакета в проекте (или через `npx` при наличии бинарей в дистрибутиве):

- **Инициализация** — создаёт пустой `gts.config.ts` в корне проекта.
- **Генерация** — читает `gts.config.ts`, загружает токены по `manifest`, запускает модули.

Типичные команды (имена зависят от настройки `package.json` / бинарей пакета):

```bash
npx gts-init
npx gts-generate
```

## Минимальный пример `gts.config.ts`

Укажите путь к **каталогу**, в котором лежит `manifest.json`, и перечислите модули:

```typescript
import {
    breakpointsFromTokenManager,
    colorsFromTokenManager,
    containerFromTokenManager,
    shadowsFromTokenManager,
    typographyFromTokenManager,
    utilitiesFromTokenManager,
} from '@greensight/gts';

export default {
    figmaToken: 'your-figma-token',
    fileId: 'your-figma-file-id',
    manifest: './tokens',
    modules: [
        colorsFromTokenManager({
            input: { includeStyles: true },
            output: { dir: './dist/colors' },
        }),
        breakpointsFromTokenManager({
            output: { dir: './dist/breakpoints' },
        }),
        containerFromTokenManager({
            output: { dir: './dist/container' },
        }),
        shadowsFromTokenManager({
            output: { dir: './dist/shadows' },
        }),
        typographyFromTokenManager({
            input: {
                breakpoints: { sm: 'mobile', md: 'tablet', lg: 'desktop' },
                fluid: true,
            },
            output: { dir: './dist/typography' },
        }),
        utilitiesFromTokenManager({
            input: {
                variablePath: 'radius',
                breakpoints: { sm: 'mobile', md: 'tablet', lg: 'desktop' },
            },
            output: { dir: './dist/utilities' },
        }),
    ],
};
```

Подробности по каждому полю конфига и модулям — в связанных страницах выше.

## Лицензия

MIT (см. [LICENSE.md](../LICENSE.md) в корне репозитория).
