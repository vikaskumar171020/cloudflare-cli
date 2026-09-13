import { Command } from 'commander';
import { registerAuthCommands } from './commands/auth/index.js';
import { registerZonesCommands } from './commands/zones/index.js';
import { registerDnsCommands } from './commands/dns/index.js';
import { registerWorkersCommands } from './commands/workers/index.js';
import { registerKvCommands } from './commands/kv/index.js';
import { registerR2Commands } from './commands/r2/index.js';
import { ConfigManager } from './utils/config.js';
import { Logger } from './utils/logger.js';
import type { OutputFormat } from './types/index.js';

export function createCli(): Command {
  const program = new Command();

  program
    .name('cloudflare-cli')
    .description('Modern CLI tool for managing Cloudflare services and infrastructure')
    .version('0.1.0')
    .option('-t, --token <token>', 'Cloudflare API Token')
    .option('-a, --account <accountId>', 'Cloudflare Account ID')
    .option('-z, --zone <zoneId>', 'Cloudflare Zone ID')
    .option('-o, --output <format>', 'Output format (table, json, yaml, csv)', 'table')
    .option('-v, --verbose', 'Enable verbose debugging logs', false)
    .hook('preAction', (thisCommand) => {
      const opts = thisCommand.opts();
      ConfigManager.loadConfig({
        apiToken: opts.token,
        accountId: opts.account,
        zoneId: opts.zone,
        outputFormat: opts.output as OutputFormat,
        verbose: Boolean(opts.verbose),
      });
      Logger.setVerbose(Boolean(opts.verbose));
    });

  // Register command modules
  registerAuthCommands(program);
  registerZonesCommands(program);
  registerDnsCommands(program);
  registerWorkersCommands(program);
  registerKvCommands(program);
  registerR2Commands(program);

  return program;
}
