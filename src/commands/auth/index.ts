import { Command } from 'commander';
import { getCloudflareClient } from '../../lib/cloudflare-client.js';
import { Logger } from '../../utils/logger.js';
import { ConfigManager } from '../../utils/config.js';

export function registerAuthCommands(program: Command) {
  const auth = program.command('auth').description('Authentication and token management commands');

  auth
    .command('verify')
    .description('Verify that the configured Cloudflare API token is valid')
    .action(async () => {
      const spinner = Logger.spinner('Verifying Cloudflare API Token...');
      try {
        const client = getCloudflareClient();
        const response = await client.user.tokens.verify();

        spinner.succeed('API Token is valid!');
        const config = ConfigManager.getConfig();

        if (config.outputFormat === 'json') {
          Logger.json(response);
        } else {
          Logger.info(`Token ID: ${response.id || 'N/A'}`);
          Logger.info(`Status: ${response.status || 'active'}`);
          if (response.expires_on) {
            Logger.info(`Expires On: ${response.expires_on}`);
          }
        }
      } catch (error) {
        spinner.fail('API Token verification failed');
        Logger.error('Failed to verify token', error);
        process.exitCode = 1;
      }
    });

  program
    .command('whoami')
    .description('Display user account details associated with the current credentials')
    .action(async () => {
      const spinner = Logger.spinner('Fetching user details...');
      try {
        const client = getCloudflareClient();
        const user = await client.user.get();

        spinner.succeed('User details fetched successfully');
        const config = ConfigManager.getConfig();

        if (config.outputFormat === 'json') {
          Logger.json(user);
        } else {
          Logger.info(`User ID: ${user.id || 'N/A'}`);
          const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'N/A';
          Logger.info(`Name: ${fullName}`);
          Logger.info(`Country: ${user.country || 'N/A'}`);
          Logger.info(`2FA Enabled: ${user.two_factor_authentication_enabled ? 'Yes' : 'No'}`);
          Logger.info(`Suspended: ${user.suspended ? 'Yes' : 'No'}`);
        }
      } catch (error) {
        spinner.fail('Failed to fetch user details');
        Logger.error('Error fetching user', error);
        process.exitCode = 1;
      }
    });
}
