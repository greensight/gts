# @greensight/gts

Generate design tokens from Figma.

## Installation

Install as a development dependency:

```bash
npm install --save-dev @greensight/gts
# or
pnpm add -D @greensight/gts
# or
yarn add --dev @greensight/gts
```

## Usage

### Initialize configuration

```bash
npx gts-init
```

This will create a `gts.config.ts` file in your project root.

### Generate tokens

```bash
npx gts-generate
```

## Configuration

Create a `gts.config.ts` file in your project root:

```typescript
import { colorsFromStyles, colorsFromVariables } from '@greensight/gts';

export default {
    figmaToken: 'your-figma-token',
    fileId: 'your-figma-file-id',
    modules: [
        colorsFromStyles({
            input: { variablePaths: ['./dark.tokens.json', './light.tokens.json'] },
            output: { jsonDir: './dist', stylesDir: './dist' },
        }),
        colorsFromVariables({
            input: { variablePaths: ['./dark.tokens.json', './light.tokens.json'] },
            output: { jsonDir: './dist', stylesDir: './dist' },
        }),
    ],
};
```

## Modules

### colorsFromStyles

Generates color tokens from Figma styles. Fetches styles from Figma API and processes them.

### colorsFromVariables

Generates color tokens directly from variable files (JSON format).

## License

MIT
