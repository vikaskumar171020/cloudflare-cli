import { Command } from 'commander';
import chalk from 'chalk';
import { getCloudflareClient } from '../../lib/cloudflare-client.js';
import { Logger } from '../../utils/logger.js';
import { ConfigManager } from '../../utils/config.js';

export function registerZonesCommands(program: Command) {
  const zones = program
    .command('zones')
    .description('Manage Cloudflare DNS Zones (domains)')
    .addHelpText(
      'after',
      `
${chalk.bold.yellow('Examples:')}
  $ cfcli zones list
  $ cfcli zones list --name example.com
  $ cfcli zones get 023e105f4ecef8ad9ca31a8372d0c353
`
    );

  zones
    .command('list')
    .description('List all zones (domains) accessible by the current credentials')
    .option('-n, --name <name>', 'Filter by zone name')
    .option('-s, --status <status>', 'Filter by status (active, pending, etc.)')
    .addHelpText(
      'after',
      `
${chalk.bold.yellow('Examples:')}
  $ cfcli zones list
  $ cfcli zones list --name example.com
  $ cfcli zones list --status active
  $ cfcli zones list --output json
  $ cfcli zones list --local
`
    )
    .action(async (options) => {
      const spinner = Logger.spinner('Fetching zones...');
      try {
        const client = getCloudflareClient();
        const response = await client.zones.list({
          name: options.name,
          status: options.status,
        });

        spinner.succeed(`Fetched ${response.result.length} zone(s)`);
        const config = ConfigManager.getConfig();

        if (config.outputFormat === 'json') {
          Logger.json(response.result);
        } else {
          const tableData = response.result.map((z) => ({
            ID: z.id,
            Name: z.name,
            Status: z.status,
            Plan: z.plan?.name || 'Free',
            Account: z.account?.name || z.account?.id || 'N/A',
          }));
          Logger.table(tableData);
        }
      } catch (error) {
        spinner.fail('Failed to list zones');
        Logger.error('Error listing zones', error);
        process.exitCode = 1;
      }
    });

  zones
    .command('get <zoneId>')
    .description('Get detailed information about a specific zone')
    .addHelpText(
      'after',
      `
${chalk.bold.yellow('Examples:')}
  $ cfcli zones get 023e105f4ecef8ad9ca31a8372d0c353
  $ cfcli zones get 023e105f4ecef8ad9ca31a8372d0c353 --output json
`
    )
    .action(async (zoneId) => {
      const spinner = Logger.spinner(`Fetching zone details for ${zoneId}...`);
      try {
        const client = getCloudflareClient();
        const response = await client.zones.get({ zone_id: zoneId });

        spinner.succeed('Zone details fetched');
        const config = ConfigManager.getConfig();

        if (config.outputFormat === 'json') {
          Logger.json(response);
        } else {
          Logger.info(`Zone Name: ${response.name}`);
          Logger.info(`Zone ID: ${response.id}`);
          Logger.info(`Status: ${response.status}`);
          Logger.info(`Name Servers: ${(response.name_servers || []).join(', ')}`);
          Logger.info(`Plan: ${response.plan?.name || 'Free'}`);
        }
      } catch (error) {
        spinner.fail('Failed to fetch zone');
        Logger.error('Error fetching zone', error);
        process.exitCode = 1;
      }
    });
}
