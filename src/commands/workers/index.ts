import { Command } from 'commander';
import chalk from 'chalk';
import { getCloudflareClient } from '../../lib/cloudflare-client.js';
import { Logger } from '../../utils/logger.js';
import { ConfigManager } from '../../utils/config.js';

export function registerWorkersCommands(program: Command) {
  const workers = program
    .command('workers')
    .description('Manage Cloudflare Workers')
    .addHelpText(
      'after',
      `
${chalk.bold.yellow('Examples:')}
  $ cloudflare-cli workers list --account 1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d
  $ cloudflare-cli workers list --local -a mock-acc-001
`
    );

  workers
    .command('list')
    .description('List all Workers scripts in the account')
    .option('-a, --account <accountId>', 'Account ID (or set CLOUDFLARE_ACCOUNT_ID)')
    .addHelpText(
      'after',
      `
${chalk.bold.yellow('Examples:')}
  $ cloudflare-cli workers list --account 1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d
  $ cloudflare-cli workers list -a 1a2b3c4d -o json
  $ cloudflare-cli workers list --local -a mock-acc-001
`
    )
    .action(async (options) => {
      const config = ConfigManager.getConfig();
      const accountId = options.account || config.accountId;

      if (!accountId) {
        Logger.error('Account ID is required. Pass --account <accountId> or set CLOUDFLARE_ACCOUNT_ID.');
        process.exitCode = 1;
        return;
      }

      const spinner = Logger.spinner(`Fetching Workers scripts for account ${accountId}...`);
      try {
        const client = getCloudflareClient();
        const response = await client.workers.scripts.list({
          account_id: accountId,
        });

        spinner.succeed(`Fetched ${response.result?.length || 0} worker(s)`);

        if (config.outputFormat === 'json') {
          Logger.json(response.result);
        } else {
          const tableData = (response.result || []).map((w: any) => ({
            ID: w.id,
            Created: w.created_on,
            Modified: w.modified_on,
            UsageModel: w.usage_model || 'standard',
          }));
          Logger.table(tableData);
        }
      } catch (error) {
        spinner.fail('Failed to list Workers');
        Logger.error('Error fetching workers', error);
        process.exitCode = 1;
      }
    });
}
