import { Command } from 'commander';
import { getCloudflareClient } from '../../lib/cloudflare-client.js';
import { Logger } from '../../utils/logger.js';
import { ConfigManager } from '../../utils/config.js';

export function registerDnsCommands(program: Command) {
  const dns = program.command('dns').description('Manage DNS records for a zone');

  dns
    .command('list')
    .description('List DNS records for a specific zone')
    .option('-z, --zone <zoneId>', 'Zone ID (or set CLOUDFLARE_ZONE_ID in .env)')
    .option('-t, --type <type>', 'Filter by record type (A, AAAA, CNAME, TXT, MX, etc.)')
    .option('-n, --name <name>', 'Filter by record name / hostname')
    .action(async (options) => {
      const config = ConfigManager.getConfig();
      const zoneId = options.zone || config.zoneId;

      if (!zoneId) {
        Logger.error('Zone ID is required. Pass --zone <zoneId> or set CLOUDFLARE_ZONE_ID.');
        process.exitCode = 1;
        return;
      }

      const spinner = Logger.spinner(`Fetching DNS records for zone ${zoneId}...`);
      try {
        const client = getCloudflareClient();
        const response = await client.dns.records.list({
          zone_id: zoneId,
          type: options.type,
          name: options.name,
        });

        spinner.succeed(`Fetched ${response.result.length} DNS record(s)`);

        if (config.outputFormat === 'json') {
          Logger.json(response.result);
        } else {
          const tableData = response.result.map((r) => ({
            ID: r.id,
            Type: r.type,
            Name: r.name,
            Content: r.content,
            Proxied: r.proxied ? 'Yes' : 'No',
            TTL: r.ttl === 1 ? 'Auto' : r.ttl,
          }));
          Logger.table(tableData);
        }
      } catch (error) {
        spinner.fail('Failed to list DNS records');
        Logger.error('Error fetching DNS records', error);
        process.exitCode = 1;
      }
    });

  dns
    .command('create')
    .description('Create a new DNS record')
    .requiredOption('-z, --zone <zoneId>', 'Zone ID')
    .requiredOption('-t, --type <type>', 'Record type (A, AAAA, CNAME, TXT, etc.)')
    .requiredOption('-n, --name <name>', 'Record name / hostname')
    .requiredOption('-c, --content <content>', 'Record content (IP, target, text)')
    .option('-p, --proxied', 'Enable Cloudflare proxy (orange cloud)', false)
    .option('--ttl <ttl>', 'Time to live (1 = automatic)', '1')
    .action(async (options) => {
      const spinner = Logger.spinner(`Creating ${options.type} record for ${options.name}...`);
      try {
        const client = getCloudflareClient();
        const record = await client.dns.records.create({
          zone_id: options.zone,
          type: options.type,
          name: options.name,
          content: options.content,
          proxied: Boolean(options.proxied),
          ttl: Number.parseInt(options.ttl, 10),
        });

        spinner.succeed(`Created DNS record ${record.id} successfully!`);
        const config = ConfigManager.getConfig();

        if (config.outputFormat === 'json') {
          Logger.json(record);
        } else {
          Logger.info(`Record ID: ${record.id}`);
          Logger.info(`Type: ${record.type}`);
          Logger.info(`Name: ${record.name}`);
          Logger.info(`Content: ${record.content}`);
          Logger.info(`Proxied: ${record.proxied ? 'Yes' : 'No'}`);
        }
      } catch (error) {
        spinner.fail('Failed to create DNS record');
        Logger.error('Error creating DNS record', error);
        process.exitCode = 1;
      }
    });

  dns
    .command('delete <recordId>')
    .description('Delete a DNS record')
    .requiredOption('-z, --zone <zoneId>', 'Zone ID')
    .action(async (recordId, options) => {
      const spinner = Logger.spinner(`Deleting DNS record ${recordId}...`);
      try {
        const client = getCloudflareClient();
        const result = await client.dns.records.delete(recordId, {
          zone_id: options.zone,
        });

        spinner.succeed(`DNS record ${result.id} deleted successfully!`);
      } catch (error) {
        spinner.fail('Failed to delete DNS record');
        Logger.error('Error deleting DNS record', error);
        process.exitCode = 1;
      }
    });
}
