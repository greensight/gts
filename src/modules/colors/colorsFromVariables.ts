import { FileStorage } from '../../classes/FileStorage';
import type { IFigmaColorVariables } from '../../common/types';
import type { IModule } from '../types';
import type { IColorToken } from './types';
import { generateColorFiles, getSolidColor } from './utils';

export interface IColorsFromVariablesInput {
    variablePaths: string[];
}

export interface IColorsFromVariablesOutput {
    jsonDir: string;
    stylesDir: string;
    jsonFileName?: string;
    cssFileName?: string;
}

export interface IColorsFromVariablesParams {
    input: IColorsFromVariablesInput;
    output: IColorsFromVariablesOutput;
}

export const colorsFromVariables = ({
    input: { variablePaths },
    output: { jsonDir, stylesDir, jsonFileName = 'colors.json', cssFileName = 'colors.css' },
}: IColorsFromVariablesParams): IModule => ({
    name: 'variables/colors',
    executor: async () => {
        try {
            if (!variablePaths.length) {
                throw new Error('At least one variable file path is required');
            }

            console.log(`[variables/colors] Reading ${variablePaths.length} variable files...`);
            const variableFiles = await Promise.all(
                variablePaths.map(async fp => {
                    try {
                        console.log(`[variables/colors] Reading file: ${fp}`);
                        return await FileStorage.readJson<IFigmaColorVariables>(fp);
                    } catch (error) {
                        console.error(`[variables/colors] Failed to read variable file: ${fp}`, error);
                        throw new Error(`Failed to read variable file "${fp}": ${(error as Error).message}`);
                    }
                })
            );

            console.log(`[variables/colors] Processing ${variableFiles.length} variable files...`);
            const colorTokensMap = new Map<string, Record<string, string>>();

            variableFiles.forEach((file, fileIndex) => {
                try {
                    if (!file.$extensions || !file.$extensions['com.figma.modeName']) {
                        console.warn(
                            `[variables/colors] File ${variablePaths[fileIndex]} is missing modeName in extensions`
                        );
                        return;
                    }

                    const modeName = file.$extensions['com.figma.modeName'];

                    Object.entries(file).forEach(([key, value]) => {
                        if (key === '$extensions') return;

                        try {
                            const variable = value as IFigmaColorVariables[string];
                            if (!variable || variable.$type !== 'color') return;

                            if (!variable.$value || !variable.$value.components) {
                                console.warn(
                                    `[variables/colors] Variable "${key}" in mode "${modeName}" has invalid structure`
                                );
                                return;
                            }

                            const { components, alpha } = variable.$value;
                            const colorValue = getSolidColor({
                                opacity: alpha ?? 1,
                                r: components[0],
                                g: components[1],
                                b: components[2],
                            });

                            if (!colorTokensMap.has(key)) {
                                colorTokensMap.set(key, {});
                            }

                            colorTokensMap.get(key)![modeName] = colorValue;
                        } catch (error) {
                            console.warn(
                                `[variables/colors] Error processing variable "${key}" in mode "${modeName}":`,
                                error
                            );
                        }
                    });
                } catch (error) {
                    console.error(`[variables/colors] Error processing file ${variablePaths[fileIndex]}:`, error);
                }
            });

            const colorTokens: IColorToken[] = Array.from(colorTokensMap.entries()).map(([name, modeColors]) => ({
                name,
                value: Object.keys(modeColors).length > 1 ? modeColors : Object.values(modeColors)[0],
            }));

            console.log(`[variables/colors] Generated ${colorTokens.length} color tokens`);

            if (colorTokens.length === 0) {
                console.warn(
                    `[variables/colors] No color tokens generated. Check your variable files structure.`
                );
                return;
            }

            console.log(`[variables/colors] Writing files to ${jsonDir} and ${stylesDir}...`);
            await generateColorFiles({
                colorTokens,
                jsonDir,
                stylesDir,
                jsonFileName,
                cssFileName,
            });

            console.log(`[variables/colors] ✅ Successfully generated color files`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[variables/colors] ❌ Failed to generate colors from variables:`, errorMessage);
            if (error instanceof Error && error.stack) {
                console.error(`[variables/colors] Stack trace:`, error.stack);
            }
            throw error;
        }
    },
});
