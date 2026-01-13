import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const createDistPackageJson = () => {
    const packageJsonPath = resolve(__dirname, '../package.json');
    const distPackageJsonPath = resolve(__dirname, '../dist/package.json');

    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

    const distPackageJson = {
        name: packageJson.name,
        version: packageJson.version,
        description: packageJson.description,
        keywords: packageJson.keywords,
        private: packageJson.private,
        engines: packageJson.engines,
        repository: packageJson.repository,
        bugs: packageJson.bugs,
        homepage: packageJson.homepage,
        license: packageJson.license,
        peerDependencies: packageJson.dependencies,
        types: './index.d.ts',
        main: './index.cjs',
        module: './index.mjs',
        exports: {
            '.': {
                types: './index.d.ts',
                import: './index.mjs',
                require: './index.cjs',
            },
        },
        bin: {
            'gts-init': './bin/init.js',
            'gts-generate': './bin/generate.js',
        },
    };

    // // Записываем новый package.json в dist
    writeFileSync(distPackageJsonPath, JSON.stringify(distPackageJson, null, 2));
};
