import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import typescript from '@rollup/plugin-typescript';
import { format } from 'path';

export default {
  input: './dist/index.js',
  output: {
    file: './dist/index.cjs',
    format: 'cjs',
    inlineDynamicImports: true, // Inlines dynamic imports if you prefer a single output file
  },
  plugins: [nodeResolve(), commonjs(), json(), typescript()],
};
