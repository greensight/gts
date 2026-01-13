import type { IFigmaColorVariables } from '../../common/types';
import type { IModule } from '../types';
import type { IColorToken } from './types';
import { FileStorage } from '../../classes/FileStorage';
import { generateColorFiles, getSolidColor, getVariableName, paintToColorToken } from './utils';

export interface IColorsFromStylesInput {
    variablePaths?: string[];
}

export interface IColorsFromStylesOutput {
    jsonDir: string;
    stylesDir: string;
    jsonFileName?: string;
    cssFileName?: string;
}

export interface IColorsFromStylesParams {
    input?: IColorsFromStylesInput;
    output: IColorsFromStylesOutput;
}

export const colorsFromStyles = ({
    input,
    output: { jsonDir, stylesDir, jsonFileName = 'colors.json', cssFileName = 'colors.css' },
}: IColorsFromStylesParams): IModule => ({
    name: 'styles/colors',
    executor: async ({ figmaApiClient }) => {
        try {
            console.log(`[styles/colors] Fetching styles from Figma...`);
            const res = await figmaApiClient.getStyles();
            const styles = res.meta.styles;

            const variablePaths = input?.variablePaths || [];

            const colors = styles.filter(s => s.style_type === 'FILL');
            console.log(`[styles/colors] Found ${colors.length} color styles`);

            if (colors.length === 0) {
                console.warn(`[styles/colors] No color styles found in Figma file`);
                return;
            }

            console.log(`[styles/colors] Fetching ${colors.length} color nodes from Figma...`);
            const colorNodesDoc = await figmaApiClient.getNodes(colors.map(c => c.node_id));
            const nodes = Object.entries(colorNodesDoc.nodes);

            let variableFiles: IFigmaColorVariables[] = [];
            if (variablePaths.length > 1) {
                console.log(`[styles/colors] Reading ${variablePaths.length} variable files...`);
                try {
                    variableFiles = await Promise.all(
                        variablePaths.map(async fp => {
                            try {
                                return await FileStorage.readJson<IFigmaColorVariables>(fp);
                            } catch (error) {
                                console.error(`[styles/colors] Failed to read variable file: ${fp}`, error);
                                throw error;
                            }
                        })
                    );
                } catch (error) {
                    console.error(`[styles/colors] Error reading variable files:`, error);
                    throw new Error(`Failed to read variable files: ${(error as Error).message}`);
                }
            }

            console.log(`[styles/colors] Processing ${nodes.length} color nodes...`);
            const colorTokens = nodes.reduce<IColorToken[]>((acc, [, value]) => {
                try {
                    const { document } = value;
                    const name = getVariableName(document.name);
                    if (document.type !== 'RECTANGLE') return acc;

                    const paint = document.fills?.[0];
                    if (!paint) return acc;

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
                } catch (error) {
                    console.warn(`[styles/colors] Error processing color node:`, error);
                    return acc;
                }
            }, []);

            console.log(`[styles/colors] Generated ${colorTokens.length} color tokens`);

            if (colorTokens.length === 0) {
                console.warn(`[styles/colors] No color tokens generated. Check your Figma styles configuration.`);
                return;
            }

            console.log(`[styles/colors] Writing files to ${jsonDir} and ${stylesDir}...`);
            await generateColorFiles({
                colorTokens,
                jsonDir,
                stylesDir,
                jsonFileName,
                cssFileName,
            });

            console.log(`[styles/colors] ✅ Successfully generated color files`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[styles/colors] ❌ Failed to generate colors from styles:`, errorMessage);
            if (error instanceof Error && error.stack) {
                console.error(`[styles/colors] Stack trace:`, error.stack);
            }
            throw error;
        }
    },
});
