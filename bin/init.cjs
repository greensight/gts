#!/usr/bin/env node

(async () => {
    try {
        const { init } = require('../index.cjs');
        await init();
    } catch (error) {
        console.error('Failed to initialize:', error);
        process.exit(1);
    }
})();
