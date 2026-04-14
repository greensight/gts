# Greensight Token System

Генерация дизайн-токенов из JSON-файлов, описанных в `manifest.json` (экспорт из Figma / JSON в духе DTCG), с загрузкой через `TokenManager`.

Ожидаемая структура экспорта соответствует плагину Figma **[Design Tokens Manager](https://www.figma.com/community/plugin/1263743870981744253/design-tokens-manager)**.

**Полная документация:** [docs/README.md](docs/README.md)

## Установка

Как dev-зависимость:

```bash
npm install --save-dev @greensight/gts
# или
pnpm add -D @greensight/gts
# или
yarn add --dev @greensight/gts
```

## Использование

### Инициализация конфигурации

```bash
npx gts-init
```

Создаёт пустой `gts.config.ts` в корне проекта.

### Генерация токенов

```bash
npx gts-generate
```

Читает `gts.config.ts`, загружает токены из каталога, указанного в `manifest` (в нём должен быть `manifest.json`), и запускает настроенные модули.

## Конфигурация

Создайте `gts.config.ts` в корне проекта. Укажите в `manifest` папку с `manifest.json` и добавьте модули из `@greensight/gts`:

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
    manifest: './path/to/tokens-dir',
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

- **Справка по полям конфига:** [docs/configuration.md](docs/configuration.md)
- **Архитектура и поток данных:** [docs/architecture.md](docs/architecture.md)
- **API модулей (таблицы input/output):** [docs/modules/](docs/modules/)

## Лицензия

MIT
