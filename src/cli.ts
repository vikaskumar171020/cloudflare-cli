import { Command } from 'commander';
import chalk from 'chalk';
import { createRequire } from 'node:module';
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

const require = createRequire(import.meta.url);
let pkgVersion = '0.1.0';
try {
  const pkg = require('../package.json');
  pkgVersion = pkg.version || '0.1.0';
} catch {
  // Fallback if package.json path differs in bundle
}

export function createCli(): Command {
  const program = new Command();

  program
    .name('cff')
    .description('Modern CLI tool for managing Cloudflare services and infrastructure')
    .version(pkgVersion)
    .option('-t, --token <token>', 'Cloudflare API Token')
    .option('-a, --account <accountId>', 'Cloudflare Account ID')
    .option('-z, --zone <zoneId>', 'Cloudflare Zone ID')
    .option('-o, --output <format>', 'Output format (table, json, yaml, csv)', 'table')
    .option('--json', 'Output results formatted as JSON (shorthand for -o json)', false)
    .option('--yaml', 'Output results formatted as YAML (shorthand for -o yaml)', false)
    .option('--csv', 'Output results formatted as CSV (shorthand for -o csv)', false)
    .option('-l, --local', 'Run in local offline mock mode (no internet / token required)', false)
    .option('-v, --verbose', 'Enable verbose debugging logs', false)
    .addHelpText(
      'after',
      `
${chalk.bold.yellow('Quick Examples:')}
  $ cff --local user:display --json
  $ cff zones list --json
  $ cff dns list -z <zoneId> --json
  $ cff dns create -z <zoneId> -t A -n api -c 1.2.3.4 --proxied
  $ cff workers list -a <accountId>
  $ cff help dns

${chalk.dim('Run "cff help" for complete command catalog and categorized examples.')}
`
    )
    .hook('preAction', (thisCommand) => {
      const opts = typeof thisCommand.optsWithGlobals === 'function'
        ? thisCommand.optsWithGlobals()
        : thisCommand.opts();

      let outputFormat: OutputFormat = (opts.output as OutputFormat) || 'table';
      if (opts.json) {
        outputFormat = 'json';
      } else if (opts.yaml) {
        outputFormat = 'yaml';
      } else if (opts.csv) {
        outputFormat = 'csv';
      }

      ConfigManager.loadConfig({
        apiToken: opts.token,
        accountId: opts.account,
        zoneId: opts.zone,
        outputFormat,
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
