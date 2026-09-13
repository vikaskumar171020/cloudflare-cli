import { Command } from 'commander';
import chalk from 'chalk';
import { registerHelpCommand } from './commands/help/index.js';
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
    .option('-l, --local', 'Run in local offline mock mode (no internet / token required)', false)
    .option('-v, --verbose', 'Enable verbose debugging logs', false)
    .addHelpText(
      'after',
      `
${chalk.bold.yellow('Quick Examples:')}
  $ cloudflare-cli --local user:display
  $ cloudflare-cli zones list
  $ cloudflare-cli dns list -z <zoneId>
  $ cloudflare-cli dns create -z <zoneId> -t A -n api -c 1.2.3.4 --proxied
  $ cloudflare-cli workers list -a <accountId>
  $ cloudflare-cli help dns

${chalk.dim('Run "cloudflare-cli help" for complete command catalog and categorized examples.')}
`
    )
    .hook('preAction', (thisCommand) => {
      const opts = thisCommand.opts();
      ConfigManager.loadConfig({
        apiToken: opts.token,
        accountId: opts.account,
        zoneId: opts.zone,
        outputFormat: opts.output as OutputFormat,
        localMode: Boolean(opts.local),
        verbose: Boolean(opts.verbose),
      });
      Logger.setVerbose(Boolean(opts.verbose));
    });

  // Register command modules
  registerHelpCommand(program);
  registerAuthCommands(program);
  registerZonesCommands(program);
  registerDnsCommands(program);
  registerWorkersCommands(program);
  registerKvCommands(program);
  registerR2Commands(program);

  return program;
}
