import { formats, transformGroups } from 'style-dictionary/enums';

export default {
    source: [`tokens/**/*.json`],
    platforms: {
        scss: {
            transformGroup: transformGroups.scss,
            buildPath: 'build/',
            files: [
                {
                    destination: 'variables.scss',
                    format: formats.scssVariables,
                },
            ],
        },
        js: {
            name: 'typescript/module',
            formatter: dictionary => {
                return `export const tokens = {\n${dictionary.allTokens
                    .map(token => {
                        return `  ${token.name}: '${token.value}'`;
                    })
                    .join(',\n')}\n};`;
            },
        },
        // ...
    },
};
