import path from 'path';

import { FileReader } from '../../classes/FileReader';
import { FileWriter } from '../../classes/FileWriter';
import type { IFigmaColorVariables } from '../../common/types';
import type { IModule } from '../types';
import type { IColorToken } from './types';
import { getCSSVariableName, getSolidColor, getVariableName, paintToColorToken } from './utils';

interface IColorsFromStylesInput {
    variablePaths?: string[];
}
interface IColorsFromStylesOutput {
    json: string;
    styles: string;
}

export const colorsFromStyles: (params: {
    input?: IColorsFromStylesInput;
    output: IColorsFromStylesOutput;
}) => IModule = ({ input, output: { json: jsonPath, styles: stylesPath } }) => ({
    name: 'styles/colors',
    executor: async ({ figmaApiClient }) => {
        const res = await figmaApiClient.getStyles();
        const styles = res.meta.styles;

        const variablePaths = input?.variablePaths || [];

        const colors = styles.filter(s => s.style_type === 'FILL');

        const colorNodesDoc = await figmaApiClient.getNodes(colors.map(c => c.node_id));
        const nodes = Object.entries(colorNodesDoc.nodes);

        let variableFiles: IFigmaColorVariables[] = [];
        if (variablePaths.length > 1) {
            const fileReader = new FileReader();
            variableFiles = await Promise.all(variablePaths.map(fp => fileReader.readJson<IFigmaColorVariables>(fp)));
        }

        const colorTokens = nodes.reduce<IColorToken[]>((acc, [, value]) => {
            const { document } = value;
            const name = getVariableName(document.name);
            if (document.type !== 'RECTANGLE') return acc;

            const paint = document.fills[0];

            if (paint.type === 'SOLID' && variableFiles.length > 1) {
                const variableId = paint.boundVariables?.color?.id;
                if (variableId) {
                    const modeColors = variableFiles.reduce<Record<string, string>>((options, file) => {
                        const color = Object.entries(file).find(
                            ([, c]) => c.$extensions['com.figma.variableId'] === variableId
                        )?.[1];
                        if (color) {
                            const { components, alpha } = color.$value;
                            const v = getSolidColor({
                                opacity: alpha,
                                r: components[0],
                                g: components[1],
                                b: components[2],
                            });
                            return { ...options, [file.$extensions['com.figma.modeName']]: v };
                        }
                        return options;
                    }, {});
                    if (Object.keys(modeColors).length > 1)
                        return [
                            ...acc,
                            {
                                name,
                                value: modeColors,
                            },
                        ];
                }
            }

            const color = paintToColorToken(paint);
            return color
                ? [
                      ...acc,
                      {
                          name,
                          value: color,
                      },
                  ]
                : acc;
        }, []);

        const fileWriter = new FileWriter();

        const cssVariables = colorTokens.reduce<Record<string, string[]>>(
            (acc, c) => {
                const name = getCSSVariableName(c.name);
                if (typeof c.value === 'object') {
                    Object.entries(c.value).forEach(([key, value]) => {
                        acc[key] = [...acc[key], `${key}: ${value};`];
                    });
                } else acc.root.push(`${name}: ${c.value}`);
                return acc;
            },
            { root: [] }
        );

        await Promise.all([
            fileWriter.write(
                path.resolve(jsonPath, 'colors.json'),
                JSON.stringify(colorTokens.reduce((acc, c) => ({ ...acc, [c.name]: c.value }), {}))
            ),
            fileWriter.write(path.resolve(stylesPath, 'colors.json')),
        ]);
    },
});
