# Конфигурация

## `IGtsConfig`

Файл `gts.config.ts` в корне рабочей директории экспортирует объект по умолчанию, совместимый с типом `IGtsConfig`.

| Поле | Тип | Обязательность | Описание |
|------|-----|----------------|----------|
| `figmaToken` | `string \| undefined` | Опционально | Токен доступа Figma API. Нужен, если в будущем появятся модули, вызывающие `FigmaAPI`. Текущие модули `*FromTokenManager` его не используют. |
| `fileId` | `string \| undefined` | Опционально | ID файла Figma. Передаётся в `FigmaAPI` вместе с `figmaToken`. |
| `manifest` | `string \| undefined` | **Рекомендуется для модулей TokenManager** | Путь к **каталогу**, в котором лежит `manifest.json`. Конструктор `TokenManager` склеивает `manifest.json` с этим путём. Если путь не задан или каталог не существует, загрузка токенов не выполнится, и модули, требующие `TokenManager`, завершатся ошибкой. |
| `modules` | `IModule[]` | **Обязательно** | Массив модулей. Каждый модуль — объект с полями `name` и `executor`. Фабрики `*FromTokenManager` возвращают готовые `IModule`. |

## Загрузка конфига

Класс `Config` компилирует `gts.config.ts` из текущей рабочей директории (`process.cwd()`) и возвращает `default`-экспорт.

## `manifest` и `TokenManager`

- Значение `manifest` — это **директория** (например `./tokens`), а не путь к файлу.
- Внутри каталога должен быть файл **`manifest.json`**.

Ожидаемый источник данных — результат экспорта плагина Figma **[Design Tokens Manager](https://www.figma.com/community/plugin/1263743870981744253/design-tokens-manager)**: структура `manifest.json`, коллекций и стилей согласована с тем, что отдаёт этот плагин.

Формат манифеста и связь коллекций/стилей с JSON-файлами описаны в [Архитектура и поток данных](architecture.md).

## Предусловия для модулей `*FromTokenManager`

После `tokenManagerClient.load()` должно выполняться `tokenManagerClient.isLoaded()` — то есть загружены и переменные, и стили из манифеста. Без корректного `manifest` и файлов токенов модули не смогут сгенерировать вывод.

## `figmaToken` и `fileId`

Создаются клиент `FigmaAPI` и передаются в `executor` каждого модуля как `figmaApiClient`. **Текущие** фабрики в репозитории используют только `tokenManagerClient`; `figmaApiClient` зарезервирован для будущих модулей или кастомных `IModule`.
