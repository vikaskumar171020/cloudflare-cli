import { Command } from 'commander';
import chalk from 'chalk';
import readline from 'node:readline';
import { getCloudflareClient } from '../../lib/cloudflare-client.js';
import { OAuthManager } from '../../lib/oauth.js';
import { Logger } from '../../utils/logger.js';
import { ConfigManager } from '../../utils/config.js';
import { UserConfigManager } from '../../utils/user-config.js';

function promptUser(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export function registerAuthCommands(program: Command) {
  const auth = program
    .command('auth')
    .description('Authentication, login, token verification, and configuration')
    .addHelpText(
      'after',
      `
${chalk.bold.yellow('Subcommands:')}
  ${chalk.cyan('auth login [token]')}     Authenticate and save Cloudflare credentials
  ${chalk.cyan('auth verify')}            Verify active API token or exchange authorization code
  ${chalk.cyan('auth status')}            View current authentication source and configuration
  ${chalk.cyan('auth logout')}            Clear stored user credentials (~/.cfcli/config.json)

${chalk.bold.yellow('Examples:')}
  $ cfcli auth login
  $ cfcli auth login my-cloudflare-api-token
  $ cfcli auth verify
  $ cfcli auth status
  $ cfcli auth logout
`
    );

  // Top-level 'login' command for instant zero-friction onboarding
  program
    .command('login [token]')
    .description('Authenticate and configure Cloudflare CLI credentials (interactive or direct token)')
    .option('--oauth', 'Use OAuth 2.0 Authorization Code PKCE flow (requires registered Cloudflare OAuth client)', false)
    .option('--manual', 'Manual authorization code entry for OAuth flow', false)
    .option('--port <port>', 'Local callback server port for OAuth', '8976')
    .option('--client-id <clientId>', 'Custom Cloudflare OAuth Client ID')
    .option('--scopes <scopes>', 'Custom OAuth scopes')
    .action(async (tokenArg, options) => {
      await handleAuthLogin(tokenArg, options);
    });

  auth
    .command('login [token]')
    .description('Authenticate and configure Cloudflare CLI credentials')
    .option('--oauth', 'Use OAuth 2.0 Authorization Code PKCE flow (requires registered Cloudflare OAuth client)', false)
    .option('--manual', 'Manual authorization code entry for OAuth flow', false)
    .option('--port <port>', 'Local callback server port for OAuth', '8976')
    .option('--client-id <clientId>', 'Custom Cloudflare OAuth Client ID')
    .option('--scopes <scopes>', 'Custom OAuth scopes')
    .addHelpText(
      'after',
      `
${chalk.bold.yellow('Examples:')}
  $ cfcli auth login
  $ cfcli auth login <api-token>
  $ cfcli auth login --oauth --client-id <client-id>
  $ cfcli auth login --local
`
    )
    .action(async (tokenArg, options) => {
      await handleAuthLogin(tokenArg, options);
    });

  auth
    .command('verify')
    .description('Verify that the active Cloudflare API token is valid, or exchange an authorization code')
    .option('-c, --code <code>', 'Exchange authorization code and verify in one step')
    .option('--client-id <clientId>', 'Custom OAuth Client ID for code exchange')
    .addHelpText(
      'after',
      `
${chalk.bold.yellow('Examples:')}
  $ cfcli auth verify
  $ cfcli auth verify --token my-secret-token
  $ cfcli auth verify --code <authCode>
  $ cfcli auth verify -o json
  $ cfcli auth verify --local
`
    )
    .action(async (options) => {
      const config = ConfigManager.getConfig();

      // If user passed --code, perform auth code exchange flow first
      if (options.code) {
        const spinner = Logger.spinner('Exchanging authorization code...');
        try {
          const { codeVerifier } = OAuthManager.generatePkce();
          const tokens = await OAuthManager.exchangeAuthCode({
            clientId: options.clientId,
            code: options.code,
            codeVerifier,
            redirectUri: 'http://localhost:8976/oauth/callback',
            localMode: config.localMode,
          });

          UserConfigManager.saveUserConfig({
            apiToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            tokenType: tokens.tokenType,
            expiresAt: tokens.expiresIn ? Date.now() + tokens.expiresIn * 1000 : undefined,
          });

          ConfigManager.loadConfig({ apiToken: tokens.accessToken, localMode: config.localMode });
          spinner.succeed('Authorization code exchanged and saved to ~/.cfcli/config.json');
        } catch (err) {
          spinner.fail('Failed to exchange authorization code');
          Logger.error('Auth code exchange error', err);
          process.exitCode = 1;
          return;
        }
      }

      const spinner = Logger.spinner('Verifying Cloudflare API Token...');
      try {
        const client = getCloudflareClient();
        const response = await client.user.tokens.verify();

        spinner.succeed('API Token is valid!');
        const currentConfig = ConfigManager.getConfig();

        if (currentConfig.outputFormat === 'json') {
          Logger.json({
            ...response,
            tokenSource: currentConfig.tokenSource,
          });
        } else {
          Logger.info(`Token ID: ${response.id || 'N/A'}`);
          Logger.info(`Status: ${response.status || 'active'}`);
          Logger.info(`Source: ${formatTokenSource(currentConfig.tokenSource)}`);
          if (response.expires_on) {
            Logger.info(`Expires On: ${response.expires_on}`);
          }
        }
      } catch (error) {
        spinner.fail('API Token verification failed');
        Logger.error('Failed to verify token', error);
        Logger.info(`Tip: Run ${chalk.cyan('cfcli login')} to authenticate or update your token.`);
        process.exitCode = 1;
      }
    });

  auth
    .command('status')
    .description('Display current authentication status and active credential source')
    .action(async () => {
      const config = ConfigManager.getConfig();
      const userConfig = UserConfigManager.readUserConfig();

      Logger.info(chalk.bold('Cloudflare CLI Authentication Status:'));
      Logger.info(`  • Active Token Source: ${formatTokenSource(config.tokenSource)}`);
      Logger.info(`  • Config Directory: ${UserConfigManager.getConfigPath()}`);

      if (userConfig.email) {
        Logger.info(`  • User Email: ${userConfig.email}`);
      }
      if (userConfig.accountId) {
        Logger.info(`  • Default Account ID: ${userConfig.accountId}`);
      }
      if (userConfig.updatedAt) {
        Logger.info(`  • Stored Credentials Updated: ${userConfig.updatedAt}`);
      }

      if (config.apiToken) {
        const masked = config.apiToken.length > 8
          ? `${config.apiToken.slice(0, 4)}...${config.apiToken.slice(-4)}`
          : '***';
        Logger.info(`  • Token Preview: ${masked}`);
      } else {
        Logger.warn('  • No API token found. Run "cfcli login" to authenticate.');
      }
    });

  auth
    .command('logout')
    .description('Log out and delete stored credentials from ~/.cfcli/config.json')
    .action(() => {
      try {
        UserConfigManager.clearUserConfig();
        Logger.success('Successfully logged out. Stored credentials removed from ~/.cfcli/config.json');
      } catch (err) {
        Logger.error('Failed to logout', err);
        process.exitCode = 1;
      }
    });

  program
    .command('user:display')
    .alias('whoami')
    .description('Display user account details associated with the current credentials')
    .addHelpText(
      'after',
      `
${chalk.bold.yellow('Examples:')}
  $ cfcli user:display
  $ cfcli user:display --output json
  $ cfcli user:display --local
`
    )
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

async function handleAuthLogin(
  tokenArg?: string,
  options?: {
    oauth?: boolean;
    manual?: boolean;
    port?: string;
    clientId?: string;
    scopes?: string;
  }
) {
  const config = ConfigManager.getConfig();
  const port = parseInt(options?.port || '8976', 10);
  const clientId = options?.clientId || process.env.CLOUDFLARE_OAUTH_CLIENT_ID;

  // Local Offline Simulation Mode
  if (config.localMode) {
    const spinner = Logger.spinner('Simulating authentication login (Local Mock Mode)...');
    const mockToken = tokenArg || (await OAuthManager.exchangeAuthCode({
      code: 'mock-auth-code-12345',
      codeVerifier: 'mock-verifier',
      redirectUri: `http://localhost:${port}/oauth/callback`,
      localMode: true,
    })).accessToken;

    UserConfigManager.saveUserConfig({
      apiToken: mockToken,
      tokenType: 'Bearer',
      expiresAt: Date.now() + 86400 * 1000,
    });

    ConfigManager.loadConfig({ apiToken: mockToken, localMode: true });
    spinner.succeed('Successfully logged in! (Offline Mock Mode)');
    Logger.info(`Token saved to ${UserConfigManager.getConfigPath()}`);
    return;
  }

  // If OAuth mode is explicitly requested or client-id is provided
  if (options?.oauth || clientId) {
    if (!clientId) {
      Logger.warn(
        `Cloudflare OAuth requires a registered OAuth Client ID in your Cloudflare account.`
      );
      Logger.info(
        `Pass your Client ID via ${chalk.cyan('--client-id <id>')} or set ${chalk.cyan('CLOUDFLARE_OAUTH_CLIENT_ID=<id>')}.`
      );
      Logger.info(
        `To authenticate without a custom OAuth app, simply run ${chalk.green('cfcli login')}.`
      );
      return;
    }

    await runOAuthPkceFlow({
      clientId,
      port,
      manual: options?.manual,
      scopes: options?.scopes,
    });
    return;
  }

  // If token is provided as an argument (e.g. cfcli login <token>)
  let token = tokenArg;

  if (!token) {
    console.log(`\n${chalk.bold.cyan('🔐 Cloudflare CLI Authentication')}`);
    console.log(`To authenticate, create an API Token in your Cloudflare Dashboard:`);
    console.log(`  ${chalk.underline.blue('https://dash.cloudflare.com/profile/api-tokens')}\n`);
    console.log(chalk.dim(`Recommended Template: "Edit Cloudflare Workers" or custom "All resources"\n`));

    // Open tokens page in browser for user convenience
    await OAuthManager.openBrowser('https://dash.cloudflare.com/profile/api-tokens');

    token = await promptUser(`${chalk.bold.yellow('? Paste your Cloudflare API Token:')} `);
  }

  if (!token) {
    Logger.error('No API token provided. Authentication cancelled.');
    process.exitCode = 1;
    return;
  }

  const spinner = Logger.spinner('Validating API Token with Cloudflare...');
  try {
    const client = getCloudflareClient(token);
    const verifyRes = await client.user.tokens.verify();

    if (verifyRes.status !== 'active') {
      spinner.warn(`Token status is "${verifyRes.status}".`);
    } else {
      spinner.succeed('API Token validated successfully!');
    }

    let userIdentifier: string | undefined;
    let accountId: string | undefined;

    // Attempt to discover user info and accounts
    try {
      const user = await client.user.get();
      userIdentifier = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.id;
    } catch {
      // Ignored if user:read permission is not granted on this token
    }

    try {
      const accountsList = await client.accounts.list();
      if (accountsList?.result && accountsList.result.length > 0) {
        accountId = accountsList.result[0]?.id;
      }
    } catch {
      // Ignored if account:read permission is not granted
    }

    // Save to user configuration (~/.cfcli/config.json)
    UserConfigManager.saveUserConfig({
      apiToken: token,
      tokenType: 'Bearer',
      email: userIdentifier,
      accountId,
      expiresAt: verifyRes.expires_on ? new Date(verifyRes.expires_on).getTime() : undefined,
    });

    ConfigManager.loadConfig({ apiToken: token, accountId });

    console.log(`\n${chalk.bold.green('✔ Authentication Complete!')}`);
    if (userIdentifier) {
      console.log(`  ${chalk.dim('•')} User: ${chalk.cyan(userIdentifier)}`);
    }
    if (accountId) {
      console.log(`  ${chalk.dim('•')} Default Account ID: ${chalk.cyan(accountId)}`);
    }
    console.log(`  ${chalk.dim('•')} Config saved to: ${chalk.dim(UserConfigManager.getConfigPath())}\n`);
    console.log(`Try running: ${chalk.cyan('cfcli zones list')} or ${chalk.cyan('cfcli user:display')}\n`);
  } catch (err) {
    spinner.fail('Token verification failed');
    Logger.error('Invalid token or network error', err);
    process.exitCode = 1;
  }
}

async function runOAuthPkceFlow(options: {
  clientId: string;
  port: number;
  manual?: boolean;
  scopes?: string;
}) {
  const { clientId, port, manual, scopes } = options;
  const { codeVerifier, codeChallenge } = OAuthManager.generatePkce();
  const state = OAuthManager.generateState();
  const redirectUri = `http://localhost:${port}/oauth/callback`;

  const authUrl = OAuthManager.buildAuthorizationUrl({
    clientId,
    redirectUri,
    state,
    codeChallenge,
    scopes,
  });

  if (manual) {
    console.log(`\n${chalk.bold.cyan('OAuth 2.0 Authorization Code Flow (Manual Mode)')}`);
    console.log(`Open the following URL in your web browser to authorize Cloudflare CLI:\n`);
    console.log(chalk.underline.blue(authUrl));
    console.log(`\nAfter authorizing, copy the authorization code from your browser.\n`);

    const code = await promptUser(chalk.bold.yellow('Enter Authorization Code: '));
    if (!code) {
      Logger.error('No authorization code provided. Login aborted.');
      process.exitCode = 1;
      return;
    }

    const spinner = Logger.spinner('Exchanging authorization code for API token...');
    try {
      const tokens = await OAuthManager.exchangeAuthCode({
        clientId,
        code,
        codeVerifier,
        redirectUri,
      });

      UserConfigManager.saveUserConfig({
        apiToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenType: tokens.tokenType,
        expiresAt: tokens.expiresIn ? Date.now() + tokens.expiresIn * 1000 : undefined,
      });

      ConfigManager.loadConfig({ apiToken: tokens.accessToken });
      spinner.succeed('Authentication successful! Token saved to ~/.cfcli/config.json');
    } catch (err) {
      spinner.fail('Token exchange failed');
      Logger.error('Error exchanging authorization code', err);
      process.exitCode = 1;
    }
    return;
  }

  // Interactive Browser Flow with Local Callback Listener
  console.log(`\n${chalk.bold.cyan('Cloudflare OAuth 2.0 Authorization Code Flow')}`);
  console.log(`Opening browser to authorize Cloudflare CLI...\n`);
  console.log(chalk.dim(`Authorization URL: ${authUrl}\n`));

  let callbackPromise: Promise<{ code: string; redirectUri: string; close: () => void }>;
  try {
    callbackPromise = OAuthManager.listenForCallback({
      port,
      expectedState: state,
      timeoutMs: 120000,
    });
  } catch (err) {
    Logger.error(`Could not start local listener on port ${port}. Try running with --manual or --port <port>.`, err);
    process.exitCode = 1;
    return;
  }

  await OAuthManager.openBrowser(authUrl);

  const spinner = Logger.spinner(`Waiting for authorization in browser on http://localhost:${port}/oauth/callback...`);

  try {
    const callbackResult = await callbackPromise;
    spinner.text = 'Exchanging authorization code for access token...';

    const tokens = await OAuthManager.exchangeAuthCode({
      clientId,
      code: callbackResult.code,
      codeVerifier,
      redirectUri: callbackResult.redirectUri,
    });

    UserConfigManager.saveUserConfig({
      apiToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenType: tokens.tokenType,
      expiresAt: tokens.expiresIn ? Date.now() + tokens.expiresIn * 1000 : undefined,
    });

    ConfigManager.loadConfig({ apiToken: tokens.accessToken });
    spinner.succeed('Authentication successful! Credentials stored in ~/.cfcli/config.json');

    const verifySpinner = Logger.spinner('Verifying token permissions...');
    try {
      const client = getCloudflareClient(tokens.accessToken);
      const verifyRes = await client.user.tokens.verify();
      verifySpinner.succeed(`Token verified! Status: ${chalk.green(verifyRes.status || 'active')}`);
    } catch {
      verifySpinner.info('Token stored. (Note: token verify check requires user:read permissions)');
    }
  } catch (err) {
    spinner.fail('OAuth authorization failed');
    Logger.error('Authentication error', err);
    Logger.info(`Tip: If running on a headless or remote server, use ${chalk.cyan('cfcli login --oauth --manual')}`);
    process.exitCode = 1;
  }
}

function formatTokenSource(source?: string): string {
  switch (source) {
    case 'flag':
      return chalk.yellow('CLI Flag (--token)');
    case 'env':
      return chalk.green('Environment Variable ($CLOUDFLARE_API_TOKEN)');
    case 'user-config':
      return chalk.cyan('Stored User Config (~/.cfcli/config.json)');
    case 'mock':
      return chalk.magenta('Offline Simulation Mode (--local)');
    default:
      return chalk.red('None (Unauthenticated)');
  }
}
