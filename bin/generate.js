#!/usr/bin/env node

// Universal bin file - works with both CJS and ESM via dynamic import
(async () => {
    const modules = process.argv.slice(2);

    try {
        // Dynamic import works in both CJS (Node 12.20+) and ESM
        const module = await import('../index.mjs');
        await module.generate(modules);
    } catch (error) {
        // Fallback to CJS if ESM fails
        try {
            const module = require('../index.cjs');
            await module.generate(modules);
        } catch (cjsError) {
            console.error('Failed to generate:', error.message || error);
            process.exit(1);
        }
    }
})();
