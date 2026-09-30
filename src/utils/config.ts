import dotenv from 'dotenv';
import { z } from 'zod';
import type { CliConfig, OutputFormat, TokenSource } from '../types/index.js';
import { UserConfigManager } from './user-config.js';

// Load environment variables from .env if present
dotenv.config();

const envSchema = z.object({
  CLOUDFLARE_API_TOKEN: z.string().optional(),
  CLOUDFLARE_ACCOUNT_ID: z.string().optional(),
  CLOUDFLARE_ZONE_ID: z.string().optional(),
  CLOUDFLARE_CLI_OUTPUT_FORMAT: z.enum(['table', 'json', 'yaml', 'csv']).default('table'),
  CLOUDFLARE_LOCAL_MODE: z
    .string()
    .optional()
    .transform((val) => val === 'true' || val === '1'),
});

export class ConfigManager {
  private static config: CliConfig;

  public static loadConfig(overrides?: Partial<CliConfig>): CliConfig {
    const env = envSchema.parse(process.env);
    const userConfig = UserConfigManager.readUserConfig();

    let apiToken: string | undefined = overrides?.apiToken;
    let tokenSource: TokenSource = 'none';

    if (overrides?.localMode || env.CLOUDFLARE_LOCAL_MODE) {
      tokenSource = 'mock';
      apiToken = apiToken || 'mock-local-token';
    } else if (overrides?.apiToken) {
      tokenSource = 'flag';
      apiToken = overrides.apiToken;
    } else if (env.CLOUDFLARE_API_TOKEN) {
      tokenSource = 'env';
      apiToken = env.CLOUDFLARE_API_TOKEN;
    } else if (userConfig.apiToken) {
      tokenSource = 'user-config';
      apiToken = userConfig.apiToken;
    }

    const accountId =
      overrides?.accountId || env.CLOUDFLARE_ACCOUNT_ID || userConfig.accountId;
    const zoneId = overrides?.zoneId || env.CLOUDFLARE_ZONE_ID || userConfig.zoneId;

    this.config = {
      apiToken,
      tokenSource,
      accountId,
      zoneId,
      outputFormat: (overrides?.outputFormat || env.CLOUDFLARE_CLI_OUTPUT_FORMAT) as OutputFormat,
      verbose: overrides?.verbose ?? false,
      localMode: overrides?.localMode ?? env.CLOUDFLARE_LOCAL_MODE ?? false,
    };

    return this.config;
  }

  public static getConfig(): CliConfig {
    if (!this.config) {
      return this.loadConfig();
    }
    return this.config;
  }

  public static requireApiToken(): string {
    const config = this.getConfig();
    if (config.localMode) {
      return config.apiToken || 'mock-local-token';
    }
    if (!config.apiToken) {
      throw new Error(
        'Missing Cloudflare API Token. Run "cff auth login" to authenticate with OAuth authorization code, provide --token, or set CLOUDFLARE_API_TOKEN in your environment.'
      );
    }
    return config.apiToken;
  }
}
