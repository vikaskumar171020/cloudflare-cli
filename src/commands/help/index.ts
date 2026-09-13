import { Command } from 'commander';
import chalk from 'chalk';

export function registerHelpCommand(program: Command) {
  program
    .command('help [command]')
    .description('Display detailed help and practical examples for commands')
    .action((commandName?: string) => {
      if (!commandName) {
        renderRootHelp();
        return;
      }

      renderCommandHelp(commandName.toLowerCase());
    });
}

function renderRootHelp() {
  console.log(`
${chalk.bold.cyan('Cloudflare CLI (cf-cli)')} - ${chalk.dim('Modern CLI tool for managing Cloudflare resources')}

${chalk.bold.yellow('Usage:')}
  ${chalk.green('cloudflare-cli')} ${chalk.magenta('[options]')} ${chalk.cyan('<command>')} ${chalk.dim('[subcommand] [flags]')}

${chalk.bold.yellow('Available Commands & Categories:')}

  ${chalk.bold('🔑 Authentication & Identity:')}
    ${chalk.cyan('auth verify')}            Verify your Cloudflare API token
    ${chalk.cyan('user:display')}           View account & user profile details (alias: whoami)

  ${chalk.bold('🌐 Zones & Domains:')}
    ${chalk.cyan('zones list')}             List all domain zones
    ${chalk.cyan('zones get <zoneId>')}     Get nameservers and details for a zone

  ${chalk.bold('📡 DNS Records:')}
    ${chalk.cyan('dns list')}               List DNS records for a zone
    ${chalk.cyan('dns create')}             Create an A, CNAME, TXT, or MX record
    ${chalk.cyan('dns delete <recordId>')}  Delete a DNS record

  ${chalk.bold('⚡ Serverless & Storage:')}
    ${chalk.cyan('workers list')}           List Cloudflare Workers scripts
    ${chalk.cyan('kv list')}                List Workers KV namespaces
    ${chalk.cyan('r2 list')}                List R2 object storage buckets

${chalk.bold.yellow('Global Flags:')}
  ${chalk.magenta('-t, --token <token>')}       Cloudflare API Token
  ${chalk.magenta('-a, --account <id>')}        Cloudflare Account ID
  ${chalk.magenta('-z, --zone <id>')}           Cloudflare Zone ID
  ${chalk.magenta('-o, --output <fmt>')}        Output format: table (default), json, yaml, csv
  ${chalk.magenta('-l, --local')}               Offline mock simulation mode (no internet required)
  ${chalk.magenta('-v, --verbose')}             Enable verbose debug logging
  ${chalk.magenta('-h, --help')}                Show command help

${chalk.bold.yellow('Quickstart Examples:')}
  ${chalk.dim('# 1. Test offline mock mode')}
  ${chalk.green('cloudflare-cli --local user:display')}

  ${chalk.dim('# 2. List zones in table format')}
  ${chalk.green('cloudflare-cli zones list')}

  ${chalk.dim('# 3. List DNS records for a specific zone')}
  ${chalk.green('cloudflare-cli dns list -z 023e105f4ecef8ad9ca31a8372d0c353')}

  ${chalk.dim('# 4. Create a proxied A record')}
  ${chalk.green('cloudflare-cli dns create -z 023e105f -t A -n api.example.com -c 192.0.2.1 --proxied')}

  ${chalk.dim('# 5. Query data formatted as pure JSON')}
  ${chalk.green('cloudflare-cli zones list -o json')}

${chalk.dim('For in-depth help and examples for a specific command, run:')}
  ${chalk.cyan('cloudflare-cli help <command>')}  ${chalk.dim('(e.g. cloudflare-cli help dns)')}
`);
}

function renderCommandHelp(command: string) {
  switch (command) {
    case 'auth':
    case 'verify':
      console.log(`
${chalk.bold.cyan('Command:')} ${chalk.bold('auth / auth verify')}
${chalk.dim('Verify credentials and check Cloudflare API Token status & expiration.')}

${chalk.bold.yellow('Examples:')}
  ${chalk.dim('# Verify API Token using .env or environment variable')}
  ${chalk.green('cloudflare-cli auth verify')}

  ${chalk.dim('# Verify an explicitly passed API Token')}
  ${chalk.green('cloudflare-cli auth verify --token v4.0.0-9a8b7c6d5e4f...')}

  ${chalk.dim('# Test token verification in local offline mode')}
  ${chalk.green('cloudflare-cli auth verify --local')}
`);
      break;

    case 'user:display':
    case 'user':
    case 'whoami':
      console.log(`
${chalk.bold.cyan('Command:')} ${chalk.bold('user:display')} ${chalk.dim('(alias: whoami)')}
${chalk.dim('Display authenticated user profile, user ID, name/country, and 2FA status.')}

${chalk.bold.yellow('Examples:')}
  ${chalk.dim('# View current user details')}
  ${chalk.green('cloudflare-cli user:display')}

  ${chalk.dim('# Output user details as JSON')}
  ${chalk.green('cloudflare-cli user:display --output json')}

  ${chalk.dim('# Test user:display in local offline mode')}
  ${chalk.green('cloudflare-cli user:display -l')}
`);
      break;

    case 'zones':
      console.log(`
${chalk.bold.cyan('Command:')} ${chalk.bold('zones')}
${chalk.dim('Manage Cloudflare DNS Zones (domains), inspect nameservers, and query plans.')}

${chalk.bold.yellow('Subcommands:')}
  ${chalk.cyan('zones list')}               List all domain zones
  ${chalk.cyan('zones get <zoneId>')}       Get detailed information about a zone

${chalk.bold.yellow('Examples:')}
  ${chalk.dim('# List all active domain zones')}
  ${chalk.green('cloudflare-cli zones list')}

  ${chalk.dim('# Filter zones by name')}
  ${chalk.green('cloudflare-cli zones list --name example.com')}

  ${chalk.dim('# Filter zones by status')}
  ${chalk.green('cloudflare-cli zones list --status active')}

  ${chalk.dim('# Get nameservers and plan details for a specific zone')}
  ${chalk.green('cloudflare-cli zones get 023e105f4ecef8ad9ca31a8372d0c353')}

  ${chalk.dim('# List zones in JSON format')}
  ${chalk.green('cloudflare-cli zones list -o json')}
`);
      break;

    case 'dns':
      console.log(`
${chalk.bold.cyan('Command:')} ${chalk.bold('dns')}
${chalk.dim('Create, list, and delete DNS records for your domain zones.')}

${chalk.bold.yellow('Subcommands:')}
  ${chalk.cyan('dns list')}                            List DNS records
  ${chalk.cyan('dns create')}                          Create a new DNS record
  ${chalk.cyan('dns delete <recordId>')}               Delete a DNS record

${chalk.bold.yellow('Examples:')}
  ${chalk.dim('# 1. List all records for a zone')}
  ${chalk.green('cloudflare-cli dns list --zone 023e105f4ecef8ad9ca31a8372d0c353')}

  ${chalk.dim('# 2. Filter DNS records by type (e.g. A records)')}
  ${chalk.green('cloudflare-cli dns list -z 023e105f -t A')}

  ${chalk.dim('# 3. Filter DNS records by hostname')}
  ${chalk.green('cloudflare-cli dns list -z 023e105f -n api.example.com')}

  ${chalk.dim('# 4. Create an A record with Cloudflare Proxy enabled (Orange Cloud)')}
  ${chalk.green('cloudflare-cli dns create -z 023e105f -t A -n api.example.com -c 192.0.2.1 --proxied')}

  ${chalk.dim('# 5. Create a CNAME record with custom TTL')}
  ${chalk.green('cloudflare-cli dns create -z 023e105f -t CNAME -n docs.example.com -c custom.domain.io --ttl 300')}

  ${chalk.dim('# 6. Delete a DNS record')}
  ${chalk.green('cloudflare-cli dns delete 372e67954025e0ba6aaa6d586b9e0b59 --zone 023e105f')}
`);
      break;

    case 'workers':
      console.log(`
${chalk.bold.cyan('Command:')} ${chalk.bold('workers')}
${chalk.dim('Manage Cloudflare Workers scripts and deployments.')}

${chalk.bold.yellow('Subcommands:')}
  ${chalk.cyan('workers list')}             List all Workers scripts in your account

${chalk.bold.yellow('Examples:')}
  ${chalk.dim('# List Workers scripts in an account')}
  ${chalk.green('cloudflare-cli workers list --account 1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d')}

  ${chalk.dim('# Output Workers scripts list as JSON')}
  ${chalk.green('cloudflare-cli workers list -a 1a2b3c4d -o json')}

  ${chalk.dim('# Test workers list in local offline mode')}
  ${chalk.green('cloudflare-cli workers list --local -a mock-acc-001')}
`);
      break;

    case 'kv':
      console.log(`
${chalk.bold.cyan('Command:')} ${chalk.bold('kv')}
${chalk.dim('Manage Cloudflare Workers KV key-value namespaces.')}

${chalk.bold.yellow('Subcommands:')}
  ${chalk.cyan('kv list')}                  List all KV namespaces in your account

${chalk.bold.yellow('Examples:')}
  ${chalk.dim('# List all KV namespaces')}
  ${chalk.green('cloudflare-cli kv list --account 1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d')}

  ${chalk.dim('# Test KV list in local offline mode')}
  ${chalk.green('cloudflare-cli kv list --local -a mock-acc-001')}
`);
      break;

    case 'r2':
      console.log(`
${chalk.bold.cyan('Command:')} ${chalk.bold('r2')}
${chalk.dim('Manage Cloudflare R2 Object Storage buckets.')}

${chalk.bold.yellow('Subcommands:')}
  ${chalk.cyan('r2 list')}                  List all R2 buckets in your account

${chalk.bold.yellow('Examples:')}
  ${chalk.dim('# List R2 storage buckets')}
  ${chalk.green('cloudflare-cli r2 list --account 1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d')}

  ${chalk.dim('# Output R2 buckets as JSON')}
  ${chalk.green('cloudflare-cli r2 list -a 1a2b3c4d -o json')}

  ${chalk.dim('# Test R2 buckets in local offline mode')}
  ${chalk.green('cloudflare-cli r2 list --local -a mock-acc-001')}
`);
      break;

    default:
      console.log(chalk.red(`Unknown command: '${command}'.`));
      console.log(`Run ${chalk.cyan('cloudflare-cli help')} to see all available commands.`);
      process.exitCode = 1;
      break;
  }
}
