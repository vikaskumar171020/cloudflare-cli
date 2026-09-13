import { Command } from 'commander';
import chalk from 'chalk';
import { getCloudflareClient } from '../../lib/cloudflare-client.js';
import { Logger } from '../../utils/logger.js';
import { ConfigManager } from '../../utils/config.js';

export function registerR2Commands(program: Command) {
  const r2 = program
    .command('r2')
    .description('Manage Cloudflare R2 Object Storage buckets')
    .addHelpText(
      'after',
      `
${chalk.bold.yellow('Examples:')}
  $ cloudflare-cli r2 list --account 1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d
  $ cloudflare-cli r2 list --local -a mock-acc-001
`
    );

  r2
    .command('list')
    .description('List all R2 buckets in the account')
    .option('-a, --account <accountId>', 'Account ID (or set CLOUDFLARE_ACCOUNT_ID)')
    .addHelpText(
      'after',
      `
${chalk.bold.yellow('Examples:')}
  $ cloudflare-cli r2 list --account 1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d
  $ cloudflare-cli r2 list -a 1a2b3c4d -o json
  $ cloudflare-cli r2 list --local -a mock-acc-001
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

      const spinner = Logger.spinner(`Fetching R2 buckets for account ${accountId}...`);
      try {
        const client = getCloudflareClient();
        const response = await client.r2.buckets.list({
          account_id: accountId,
        });

        const buckets = response.buckets || [];
        spinner.succeed(`Fetched ${buckets.length} R2 bucket(s)`);

        if (config.outputFormat === 'json') {
          Logger.json(buckets);
        } else {
          const tableData = buckets.map((b) => ({
            Name: b.name,
            CreationDate: b.creation_date,
            Location: b.location || 'default',
          }));
          Logger.table(tableData);
        }
      } catch (error) {
        spinner.fail('Failed to list R2 buckets');
        Logger.error('Error fetching R2 buckets', error);
        process.exitCode = 1;
      }
    });
}
