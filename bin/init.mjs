#!/usr/bin/env node

import { init } from '../index.mjs';

init().catch(error => {
    console.error('Failed to initialize:', error);
    process.exit(1);
});
