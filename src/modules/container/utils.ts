import { FileStorage } from '../../classes/FileStorage';
import type { IContainerToken } from './types';

const buildMediaQueryContent = (token: IContainerToken): string =>
    `    @media (width <= ${token.breakpoint}px) {
        .container {
            padding-left: ${token.offset};
            padding-right: ${token.offset};
        }

        .containerTablet {
            padding-left: ${token.offset};
            padding-right: ${token.offset};
        }
    }`;

export const buildContainerCSS = (containerTokens: IContainerToken[], layer?: string): string => {
    const layerName = layer || 'components';
    const mediaQueries = containerTokens.map(token => buildMediaQueryContent(token)).join('\n\n');

    return `@layer ${layerName} {\n${mediaQueries}\n}`;
};

export const buildContainerIndex = (): string =>
    `import styles from './styles.module.css';

export const conatinerClassName = styles.container;
export const conatinerTabletClassName = styles.containerTablet;
`;

export const deleteAndWriteFile = async (fileName: string, content: string, directory: string) => {
    await FileStorage.delete(fileName, directory);
    await FileStorage.write(fileName, content, { directory });
};

interface IGenerateContainerFilesParams {
    containerTokens: IContainerToken[];
    dir: string;
    layer?: string;
}

export const generateContainerFiles = async ({ containerTokens, dir, layer }: IGenerateContainerFilesParams) => {
    const stylesContent = buildContainerCSS(containerTokens, layer);
    const indexContent = buildContainerIndex();

    await deleteAndWriteFile('styles.module.css', stylesContent, dir);
    await deleteAndWriteFile('index.ts', indexContent, dir);
};
