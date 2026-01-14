#!/usr/bin/env node

(async () => {
    try {
        const { generate } = require('../index.cjs');
        const modules = process.argv.slice(2);
        await generate(modules);
    } catch (error) {
        console.error('Failed to generate:', error);
        process.exit(1);
    }
})();
