import { UploadSourceMapsHandler } from '@byteboost/cli/sdk';
import { readFileSync } from 'fs';
import path from 'path';
import type Webpack from 'webpack';

export interface OptionsInterface {
  organization: string;
  domain: string;
  token: string;
  logging?: boolean;
  versionFromPackageJSON?: boolean;
  version?: string;
  debug?: boolean;
  cleanupSourceMaps?: boolean;
}

export class ByteboostSourcemaps {
  static defaultOptions: OptionsInterface = {
    organization: '',
    domain: '',
    token: '',
    logging: false,
    debug: false,
    cleanupSourceMaps: true,
  };

  public options: Partial<OptionsInterface> = {};

  private compiler: Webpack.Compiler | null = null;

  constructor(options: Partial<OptionsInterface> = {}) {
    if (!options.token) {
      throw new Error('[Byteboost] token is required');
    }

    if (!options.organization) {
      throw new Error('[Byteboost] organization is required');
    }

    if (!options.domain) {
      throw new Error('[Byteboost] domain is required');
    }

    if (!options.version && !options.versionFromPackageJSON) {
      throw new Error('[Byteboost] version is required');
    }

    if (options.version && options.versionFromPackageJSON) {
      throw new Error(
        '[Byteboost] version and versionFromPackageJSON cannot be used together',
      );
    }

    if (options.debug) {
      process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
    }

    this.options = { ...ByteboostSourcemaps.defaultOptions, ...options };
  }

  private parseJSON(content: string) {
    try {
      return JSON.parse(content);
    } catch (e: any) {
      return null;
    }
  }

  private getVersion() {
    if (this.options.version) {
      return this.options.version;
    }

    try {
      const packageJSONContent = readFileSync(
        `${this.compiler?.context || ''}/package.json`,
        'utf-8',
      );

      const packageJSON = this.parseJSON(packageJSONContent);

      if (!packageJSON) {
        throw new Error('[Byteboost] Couldnt parse package.json');
      }

      return packageJSON.version;
    } catch (e: any) {
      throw new Error(e.message);
    }
  }

  async apply(compiler: Webpack.Compiler) {
    this.compiler = compiler;

    const handler = new UploadSourceMapsHandler(compiler.context);

    const isValidJsDir = handler.isPathValidJsDirectory();

    if (!isValidJsDir) {
      this.warn(
        `The path ${path} is not a valid JS project directory. Couldn't find package.json`,
      );
      return;
    }

    handler.version = this.getVersion();

    this.log(`Tagging source maps with version ${handler.version}`);

    handler.env = {
      BYTEBOOST_ORGANIZATION: this.options.organization,
      BYTEBOOST_DOMAIN: this.options.domain,
      BYTEBOOST_TOKEN: this.options.token,
    };

    compiler.hooks.afterDone.tap('ByteboostSourcemap', async () => {
      handler.compileSourceMapPathsList();

      if (!handler.mapFilePaths[0]) {
        this.warn(`No sourcemaps found in ${handler.fullpath}`);
        return;
      }

      await handler.tagFilesWithDebugInfo();

      await handler.uploadSourcemaps();

      if (this.options.cleanupSourceMaps) {
        handler.cleanupSourceMaps();

        this.log('Sourcemaps cleaned up');
      }

      this.log(`Uploaded sourcemaps.`);
    });
  }

  private log(message: string) {
    if (this.options.logging) {
      console.log(`[Byteboost][INFO]: ${message}`);
    }
  }

  private warn(message: string) {
    if (this.options.logging) {
      console.warn(`[Byteboost][WARN]: ${message}`);
    }
  }
}
