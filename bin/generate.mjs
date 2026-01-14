#!/usr/bin/env node

import { generate } from '../index.mjs';

const modules = process.argv.slice(2);

generate(modules).catch(error => {
    console.error('Failed to generate:', error);
    process.exit(1);
});
