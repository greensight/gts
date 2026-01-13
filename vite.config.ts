import commonjsPlugin from '@rollup/plugin-commonjs';
import { resolve } from 'node:path';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { viteStaticCopy } from 'vite-plugin-static-copy';

import { createDistPackageJson } from './plugins/createPackageJson';

export default defineConfig({
    build: {
        lib: {
            entry: './src/index.ts',
            fileName: format => `index.${format === 'es' ? 'mjs' : 'cjs'}`,
            formats: ['es', 'cjs'],
        },
        rollupOptions: {
            plugins: [
                peerDepsExternal({
                    includeDependencies: true,
                }),
                commonjsPlugin(),
            ],
            external: [
                'ts-import',
                'path',
                'fs',
                'typedoc',
                'node:path',
                'node:fs',
                'node:fs/promises',
                'node:readline',
            ],
            output: [
                {
                    format: 'es',
                    entryFileNames: '[name].mjs',
                    chunkFileNames: 'chunks/[name]-[hash].mjs',
                    assetFileNames: 'assets/[name].[ext]',
                },
                {
                    format: 'cjs',
                    entryFileNames: '[name].cjs',
                    chunkFileNames: 'chunks/[name]-[hash].cjs',
                    assetFileNames: 'assets/[name].[ext]',
                },
            ],
        },
    },
    plugins: [
        dts(),
        viteStaticCopy({
            targets: [
                { src: resolve(__dirname, 'bin/*'), dest: resolve(__dirname, 'dist/bin') },
                { src: resolve(__dirname, 'README.md'), dest: resolve(__dirname, 'dist') },
                { src: resolve(__dirname, 'LICENSE.md'), dest: resolve(__dirname, 'dist') },
            ],
        }),
        {
            name: 'create-dist-package-json',
            closeBundle: () => {
                createDistPackageJson();
            },
        },
    ],
});
