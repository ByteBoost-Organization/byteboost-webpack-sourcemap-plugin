import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';

export default {
  input: './dist/index.js',
  output: {
    dir: 'dist/',
    format: 'cjs',
    entryFileNames: '[name].cjs',
    // inlineDynamicImports: true, // Inlines dynamic imports if you prefer a single output file
    preserveModules: true,
  },
  // plugins: [nodeResolve(), commonjs(), json(), typescript()],
};
