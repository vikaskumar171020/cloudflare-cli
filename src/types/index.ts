export type OutputFormat = 'table' | 'json' | 'yaml' | 'csv';

export interface CliConfig {
  apiToken?: string;
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
