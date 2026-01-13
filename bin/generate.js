#!/usr/bin/env node
import { generate } from '../index.js';

const modules = process.argv.slice(2);

generate(modules);
