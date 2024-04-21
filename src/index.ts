import { existsSync, readFileSync } from 'fs';
import path from 'path';
import mime from 'mime';
import FormData from 'form-data';
import fetch from 'node-fetch';

import Webpack from 'webpack';

export class ByteboostSourcemaps {
  apply(compiler: Webpack.Compiler) {
    compiler.hooks.done.tap('ByteboostSourcemaps', (stats) => {
      stats.compilation.chunks.forEach((chunk) => {
        chunk.files.forEach(async (file) => {
          const codePath = path.join(compiler.options.output.path!, file);
          const sourcemapPath = path.join(
            compiler.options.output.path!,
            `${file}.map`,
          );

          if (!existsSync(codePath)) {
            console.warn(`Code file not found: ${codePath}`);
            return;
          }

          if (!existsSync(sourcemapPath)) {
            console.warn(`Sourcemap file not found: ${sourcemapPath}`);
            return;
          }

          const form = new FormData();

          form.append('files', readFileSync(codePath), {
            filename: file,
            contentType: mime.getType(codePath) ?? undefined,
          });

          form.append('files', readFileSync(sourcemapPath), {
            filename: `${file}.map`,
            contentType: mime.getType(sourcemapPath) ?? undefined,
          });

          await fetch(`https://dev.api.byteboost.com/sourcemap`, {
            method: 'POST',
            headers: {
              ...form.getHeaders(),
              ['X-Auth-Token']: 'test',
            },
            insecureHTTPParser: true,
            body: form,
          });
        });
      });
    });
  }
}
