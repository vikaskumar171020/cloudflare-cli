export type OutputFormat = 'table' | 'json' | 'yaml' | 'csv';

export interface CliConfig {
  apiToken?: string;
  accountId?: string;
  zoneId?: string;
  outputFormat: OutputFormat;
  verbose: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  messages?: string[];
}
