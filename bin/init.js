#!/usr/bin/env node

// Universal bin file - works with both CJS and ESM via dynamic import
(async () => {
    try {
        // Dynamic import works in both CJS (Node 12.20+) and ESM
        const module = await import('../index.mjs');
        await module.init();
    } catch (error) {
        // Fallback to CJS if ESM fails
        try {
            const module = require('../index.cjs');
            await module.init();
        } catch (cjsError) {
            console.error('Failed to initialize:', error.message || error);
            process.exit(1);
        }
    }
})();
