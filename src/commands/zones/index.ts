import { Command } from 'commander';
import { getCloudflareClient } from '../../lib/cloudflare-client.js';
import { Logger } from '../../utils/logger.js';
import { ConfigManager } from '../../utils/config.js';

export function registerZonesCommands(program: Command) {
  const zones = program.command('zones').description('Manage Cloudflare DNS Zones (domains)');

  zones
    .command('list')
    .description('List all zones (domains) accessible by the current credentials')
    .option('-n, --name <name>', 'Filter by zone name')
    .option('-s, --status <status>', 'Filter by status (active, pending, etc.)')
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
