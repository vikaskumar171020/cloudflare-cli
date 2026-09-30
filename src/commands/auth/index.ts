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
  ${chalk.cyan('auth logout')}            Clear stored user credentials (~/.cff/config.json)

${chalk.bold.yellow('Examples:')}
  $ cff auth login
  $ cff auth login my-cloudflare-api-token
  $ cff auth verify
  $ cff auth status
  $ cff auth logout
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
  $ cff auth login
  $ cff auth login <api-token>
  $ cff auth login --oauth --client-id <client-id>
  $ cff auth login --local
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
  $ cff auth verify
  $ cff auth verify --token my-secret-token
  $ cff auth verify --code <authCode>
  $ cff auth verify -o json
  $ cff auth verify --local
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
          spinner.succeed('Authorization code exchanged and saved to ~/.cff/config.json');
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
        Logger.info(`Tip: Run ${chalk.cyan('cff login')} to authenticate or update your token.`);
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
        Logger.warn('  • No API token found. Run "cff login" to authenticate.');
      }
    });

  auth
    .command('permissions')
    .alias('access')
    .alias('inspect')
    .description('Audit all access permissions, resource scopes, and capabilities of the active API token')
    .addHelpText(
      'after',
      `
${chalk.bold.yellow('Examples:')}
  $ cff auth permissions
  $ cff auth permissions --output json
  $ cff auth permissions --zone <zoneId> --account <accountId>
  $ cff auth permissions --local
`
    )
    .action(async () => {
      await handleAuthPermissions();
    });

  program
    .command('permissions')
    .alias('token:permissions')
    .alias('token:access')
    .description('Audit all access permissions, resource scopes, and capabilities of the active API token')
    .action(async () => {
      await handleAuthPermissions();
    });

  auth
    .command('logout')
    .description('Log out and delete stored credentials from ~/.cff/config.json')
    .action(() => {
      try {
        UserConfigManager.clearUserConfig();
        Logger.success('Successfully logged out. Stored credentials removed from ~/.cff/config.json');
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
  $ cff user:display
  $ cff user:display --output json
  $ cff user:display --local
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
        `To authenticate without a custom OAuth app, simply run ${chalk.green('cff login')}.`
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

  // If token is provided as an argument (e.g. cff login <token>)
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

    // Save to user configuration (~/.cff/config.json)
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
    console.log(`Try running: ${chalk.cyan('cff zones list')} or ${chalk.cyan('cff user:display')}\n`);
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
      spinner.succeed('Authentication successful! Token saved to ~/.cff/config.json');
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
    spinner.succeed('Authentication successful! Credentials stored in ~/.cff/config.json');

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
    Logger.info(`Tip: If running on a headless or remote server, use ${chalk.cyan('cff login --oauth --manual')}`);
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
      return chalk.cyan('Stored User Config (~/.cff/config.json)');
    case 'mock':
      return chalk.magenta('Offline Simulation Mode (--local)');
    default:
      return chalk.red('None (Unauthenticated)');
  }
}

interface ServiceAccessResult {
  service: string;
  category: string;
  status: 'Granted' | 'Denied' | 'Unknown';
  summary: string;
  details?: Record<string, any>;
}

async function handleAuthPermissions() {
  const config = ConfigManager.getConfig();
  const token = config.apiToken;

  if (!token && !config.localMode) {
    Logger.error('Missing API Token. Run "cff login" or provide --token.');
    process.exitCode = 1;
    return;
  }

  const spinner = Logger.spinner('Auditing API token access and permission scopes...');
  try {
    const client = getCloudflareClient();

    // 1. Verify token
    let verifyRes: any;
    try {
      verifyRes = await client.user.tokens.verify();
    } catch (err) {
      spinner.fail('Token verification failed');
      Logger.error('Invalid token or connection error', err);
      process.exitCode = 1;
      return;
    }

    const tokenId = verifyRes.id;
    let tokenDetails: any = null;

    // 2. Attempt to fetch detailed token policies if permitted
    if (tokenId && client.user?.tokens?.get) {
      try {
        tokenDetails = await client.user.tokens.get(tokenId);
      } catch {
        // Token might not have user:tokens:read permission, which is expected for scoped tokens
      }
    }

    // 3. Probe service permissions concurrently with safe read operations
    const accessMatrix: ServiceAccessResult[] = [];

    // Probe 1: User Profile
    try {
      const user = await client.user.get();
      const userName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.id || 'User';
      accessMatrix.push({
        service: 'User Profile',
        category: 'Identity',
        status: 'Granted',
        summary: `Read access granted (${userName})`,
        details: { id: user.id, email: (user as any).email, name: userName },
      });
    } catch {
      accessMatrix.push({
        service: 'User Profile',
        category: 'Identity',
        status: 'Denied',
        summary: 'No user:read permission',
      });
    }

    // Probe 2: Accounts
    let accessibleAccountIds: string[] = [];
    try {
      const accountsRes = await client.accounts.list();
      const accounts = accountsRes.result || [];
      accessibleAccountIds = accounts.map((a: any) => a.id).filter(Boolean);
      accessMatrix.push({
        service: 'Accounts',
        category: 'Identity & Access',
        status: 'Granted',
        summary: `${accounts.length} account(s) accessible`,
        details: { count: accounts.length, accounts: accounts.map((a: any) => ({ id: a.id, name: a.name })) },
      });
    } catch {
      accessMatrix.push({
        service: 'Accounts',
        category: 'Identity & Access',
        status: 'Denied',
        summary: 'No account:read permission',
      });
    }

    // Probe 3: Zones
    let accessibleZoneIds: string[] = [];
    try {
      const zonesRes = await client.zones.list();
      const zones = zonesRes.result || [];
      accessibleZoneIds = zones.map((z: any) => z.id).filter(Boolean);
      accessMatrix.push({
        service: 'Zones & Domains',
        category: 'Network & DNS',
        status: 'Granted',
        summary: `${zones.length} zone(s) accessible`,
        details: { count: zones.length, zones: zones.map((z: any) => ({ id: z.id, name: z.name })) },
      });
    } catch {
      accessMatrix.push({
        service: 'Zones & Domains',
        category: 'Network & DNS',
        status: 'Denied',
        summary: 'No zone:read permission',
      });
    }

    // Probe 4: DNS Records
    const targetZoneId = config.zoneId || accessibleZoneIds[0];
    if (targetZoneId) {
      try {
        const dnsRes = await client.dns.records.list({ zone_id: targetZoneId });
        accessMatrix.push({
          service: 'DNS Records',
          category: 'Network & DNS',
          status: 'Granted',
          summary: `Read access granted on zone ${targetZoneId} (${dnsRes.result?.length ?? 0} records)`,
        });
      } catch {
        accessMatrix.push({
          service: 'DNS Records',
          category: 'Network & DNS',
          status: 'Denied',
          summary: `No dns_records:read access on zone ${targetZoneId}`,
        });
      }
    } else {
      accessMatrix.push({
        service: 'DNS Records',
        category: 'Network & DNS',
        status: 'Unknown',
        summary: 'Specify --zone <zoneId> to probe specific zone DNS records',
      });
    }

    // Probe 5: Cloudflare Workers
    const targetAccountId = config.accountId || accessibleAccountIds[0];
    if (targetAccountId) {
      try {
        const workersRes = await client.workers.scripts.list({ account_id: targetAccountId });
        accessMatrix.push({
          service: 'Workers Scripts',
          category: 'Serverless',
          status: 'Granted',
          summary: `Read access granted on account ${targetAccountId} (${workersRes.result?.length ?? 0} workers)`,
        });
      } catch {
        accessMatrix.push({
          service: 'Workers Scripts',
          category: 'Serverless',
          status: 'Denied',
          summary: `No workers:read access on account ${targetAccountId}`,
        });
      }

      // Probe 6: Workers KV
      try {
        const kvRes = await client.kv.namespaces.list({ account_id: targetAccountId });
        accessMatrix.push({
          service: 'Workers KV',
          category: 'Storage',
          status: 'Granted',
          summary: `Read access granted on account ${targetAccountId} (${kvRes.result?.length ?? 0} namespaces)`,
        });
      } catch {
        accessMatrix.push({
          service: 'Workers KV',
          category: 'Storage',
          status: 'Denied',
          summary: `No kv:read access on account ${targetAccountId}`,
        });
      }

      // Probe 7: R2 Object Storage
      try {
        const r2Res = await client.r2.buckets.list({ account_id: targetAccountId });
        accessMatrix.push({
          service: 'R2 Object Storage',
          category: 'Storage',
          status: 'Granted',
          summary: `Read access granted on account ${targetAccountId} (${r2Res.buckets?.length ?? 0} buckets)`,
        });
      } catch {
        accessMatrix.push({
          service: 'R2 Object Storage',
          category: 'Storage',
          status: 'Denied',
          summary: `No r2:read access on account ${targetAccountId}`,
        });
      }
    } else {
      accessMatrix.push({
        service: 'Workers & Storage',
        category: 'Serverless / Storage',
        status: 'Unknown',
        summary: 'Specify --account <accountId> to probe Workers, KV, and R2 permissions',
      });
    }

    spinner.succeed('Token access audit completed successfully!');

    // Output formatting
    if (config.outputFormat === 'json') {
      Logger.json({
        token: {
          id: tokenId,
          status: verifyRes.status,
          source: config.tokenSource,
          not_before: verifyRes.not_before,
          expires_on: verifyRes.expires_on,
        },
        policies: tokenDetails?.policies || null,
        accessMatrix,
      });
      return;
    }

    // Render Formatted Terminal Display
    console.log(`\n${chalk.bold.cyan('🛡️  Cloudflare API Token Permissions & Access Audit')}`);
    console.log(chalk.dim('─'.repeat(65)));
    console.log(`  ${chalk.bold('Token ID:')}     ${chalk.cyan(tokenId || 'N/A')}`);
    console.log(`  ${chalk.bold('Status:')}       ${verifyRes.status === 'active' ? chalk.green('✔ active') : chalk.red(verifyRes.status)}`);
    console.log(`  ${chalk.bold('Source:')}       ${formatTokenSource(config.tokenSource)}`);
    if (verifyRes.expires_on) {
      console.log(`  ${chalk.bold('Expires On:')}   ${chalk.yellow(verifyRes.expires_on)}`);
    }
    console.log(chalk.dim('─'.repeat(65)));

    if (tokenDetails?.policies && tokenDetails.policies.length > 0) {
      console.log(`\n${chalk.bold.yellow('📜 Explicit Token Permission Policies:')}`);
      tokenDetails.policies.forEach((p: any, idx: number) => {
        const perms = (p.permission_groups || []).map((g: any) => g.name || g.id).join(', ');
        const resources = Object.entries(p.resources || {})
          .map(([k, v]) => `${k} => ${v}`)
          .join('; ') || 'All Resources';
        console.log(`  ${chalk.cyan(`Policy ${idx + 1}`)} [${p.effect.toUpperCase()}]: ${chalk.white(perms || 'Custom')}`);
        console.log(`    ${chalk.dim('Scope:')} ${chalk.dim(resources)}`);
      });
    }

    console.log(`\n${chalk.bold.yellow('🔍 Probed Service Access Matrix:')}`);
    const tableData = accessMatrix.map((item) => {
      let statusFormatted: string = item.status;
      if (item.status === 'Granted') {
        statusFormatted = chalk.green('✔ Granted');
      } else if (item.status === 'Denied') {
        statusFormatted = chalk.red('✖ Denied');
      } else {
        statusFormatted = chalk.gray('? Pending/N/A');
      }
      return {
        Service: item.service,
        Category: item.category,
        Access: statusFormatted,
        'Details / Summary': item.summary,
      };
    });

    Logger.table(tableData);
    console.log(chalk.dim('Tip: Use --zone <zoneId> or --account <accountId> to probe specific resource scopes.\n'));

  } catch (error) {
    spinner.fail('Failed to audit token permissions');
    Logger.error('Error auditing token permissions', error);
    process.exitCode = 1;
  }
}
