export type OutputFormat = 'table' | 'json' | 'yaml' | 'csv';
export type TokenSource = 'flag' | 'env' | 'user-config' | 'mock' | 'none';

export interface CliConfig {
  apiToken?: string;
  tokenSource?: TokenSource;
  accountId?: string;
  zoneId?: string;
  outputFormat: OutputFormat;
  verbose: boolean;
  localMode: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  messages?: string[];
}

