import { Command } from 'commander';
import { getCloudflareClient } from '../../lib/cloudflare-client.js';
import { Logger } from '../../utils/logger.js';
import { ConfigManager } from '../../utils/config.js';

export function registerKvCommands(program: Command) {
  const kv = program.command('kv').description('Manage Cloudflare Workers KV namespaces and keys');

  kv
    .command('list')
    .description('List all KV namespaces in the account')
    .option('-a, --account <accountId>', 'Account ID (or set CLOUDFLARE_ACCOUNT_ID)')
    .action(async (options) => {
      const config = ConfigManager.getConfig();
      const accountId = options.account || config.accountId;

      if (!accountId) {
        Logger.error('Account ID is required. Pass --account <accountId> or set CLOUDFLARE_ACCOUNT_ID.');
        process.exitCode = 1;
        return;
      }

      const spinner = Logger.spinner(`Fetching KV namespaces for account ${accountId}...`);
      try {
        const client = getCloudflareClient();
        const response = await client.kv.namespaces.list({
          account_id: accountId,
        });

        spinner.succeed(`Fetched ${response.result.length} namespace(s)`);

        if (config.outputFormat === 'json') {
          Logger.json(response.result);
        } else {
          const tableData = response.result.map((ns) => ({
            ID: ns.id,
            Title: ns.title,
            SupportsURLKeys: ns.supports_url_encoding ? 'Yes' : 'No',
          }));
          Logger.table(tableData);
        }
      } catch (error) {
        spinner.fail('Failed to list KV namespaces');
        Logger.error('Error fetching KV namespaces', error);
        process.exitCode = 1;
      }
    });
}
