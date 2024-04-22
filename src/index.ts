import { existsSync, readFileSync } from 'fs';
import mime from 'mime';
import path from 'path';
import Webpack from 'webpack';

export interface OptionsInterface {
  organization: string;
  domain: string;
  token: string;
  logging?: boolean;
  // versionFromPackageJSON?: boolean;
  version?: string;
  debug?: boolean;
}

export class ByteboostSourcemaps {
  static defaultOptions: OptionsInterface = {
    organization: '',
    domain: '',
    token: '',
    logging: false,
    debug: false,
  };

  // private version = '';

  public options: Partial<OptionsInterface> = {};

  private compiler: Webpack.Compiler | null = null;

  constructor(options: Partial<OptionsInterface> = {}) {
    if (!options.token) {
      throw new Error('token is required');
    }

    if (!options.organization) {
      throw new Error('organization is required');
    }

    if (!options.domain) {
      throw new Error('domain is required');
    }

    // if (!options.versionFromPackageJSON && !options.version) {
    //   throw new Error('Either packageJSONVersion or version is required');
    // }

    // if (options.versionFromPackageJSON && options.version) {
    //   throw new Error('Only one of packageJSONVersion or version is allowed');
    // }

    if (!options.version) {
      throw new Error('version is required');
    }

    if (options.debug) {
      process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
    }

    this.options = { ...ByteboostSourcemaps.defaultOptions, ...options };
  }

  private getFilePathAsBlob(filePath: string) {
    try {
      const content = readFileSync(filePath, {
        encoding: 'utf-8',
      });

      return new Blob([content], {
        type: mime.getType(filePath) ?? undefined,
      });
    } catch (err: any) {
      throw err;
    }
  }

  private handleUpload = (stats: Webpack.Stats) => {
    if (!this.compiler) {
      throw new Error('Compiler not found');
    }

    stats.compilation.chunks.forEach((chunk) => {
      chunk.files.forEach(async (file) => {
        const codePath = path.join(this.compiler?.options.output.path!, file);
        const sourcemapPath = path.join(
          this.compiler?.options.output.path!,
          `${file}.map`,
        );

        if (!existsSync(codePath)) {
          this.warn(`Code file not found: ${codePath}`);
          return;
        }

        if (!existsSync(sourcemapPath)) {
          this.warn(`Sourcemap file not found: ${sourcemapPath}`);
          return;
        }

        const form = new FormData();

        form.append('files', this.getFilePathAsBlob(codePath), file);

        form.append(
          'files',
          this.getFilePathAsBlob(sourcemapPath),
          `${file}.map`,
        );

        form.append('domain', this.options.domain!);
        form.append('organization', this.options.organization!);
        form.append('version', this.options.version!);

        const res = await fetch(
          `https://dev.external.api.byteboost.io/v1beta/public/sourcemaps`,
          {
            method: 'POST',
            headers: {
              'x-auth-token': this.options.token!,
            },
            body: form,
          },
        );

        if (res.status !== 201) {
          try {
            const data = (await res.json()) as any;
            throw new Error(data.errors[0].message);
          } catch (err: any) {
            this.error(`Failed to upload sourcemap: ${sourcemapPath}`);
          }
        } else {
          this.log(`Uploaded sourcemap: ${sourcemapPath}`);
        }

        return true;
      });
    });
  };

  apply(compiler: Webpack.Compiler) {
    this.compiler = compiler;

    compiler.hooks.afterDone.tap('ByteboostSourcemaps', this.handleUpload);
  }

  private log(message: string) {
    if (this.options.logging) {
      console.log(`[INFO]: ${message}`);
    }
  }

  private error(message: string) {
    if (this.options.logging) {
      console.error(`[ERROR]: ${message}`);
    }
  }

  private warn(message: string) {
    if (this.options.logging) {
      console.warn(`[WARN]: ${message}`);
    }
  }
}
