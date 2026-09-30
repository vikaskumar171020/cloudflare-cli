import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { OAuthManager } from '../src/lib/oauth.js';
import { UserConfigManager } from '../src/utils/user-config.js';
import { ConfigManager } from '../src/utils/config.js';
import { createCli } from '../src/cli.js';

describe('OAuthManager & PKCE', () => {
  it('should generate valid PKCE code verifier and challenge', () => {
    const { codeVerifier, codeChallenge } = OAuthManager.generatePkce();
    expect(codeVerifier).toBeDefined();
    expect(codeChallenge).toBeDefined();
    expect(typeof codeVerifier).toBe('string');
    expect(typeof codeChallenge).toBe('string');
    expect(codeVerifier.length).toBeGreaterThanOrEqual(43);
    expect(codeChallenge.length).toBeGreaterThanOrEqual(43);
  });

  it('should build a well-formed Cloudflare authorization URL', () => {
    const { codeChallenge } = OAuthManager.generatePkce();
    const state = OAuthManager.generateState();
    const urlString = OAuthManager.buildAuthorizationUrl({
      clientId: 'custom-client-id',
      redirectUri: 'http://localhost:8976/oauth/callback',
      state,
      codeChallenge,
      scopes: 'workers:write zone:read',
    });

    const parsed = new URL(urlString);
    expect(parsed.origin).toBe('https://dash.cloudflare.com');
    expect(parsed.pathname).toBe('/oauth2/auth');
    expect(parsed.searchParams.get('client_id')).toBe('custom-client-id');
    expect(parsed.searchParams.get('redirect_uri')).toBe('http://localhost:8976/oauth/callback');
    expect(parsed.searchParams.get('state')).toBe(state);
    expect(parsed.searchParams.get('code_challenge')).toBe(codeChallenge);
    expect(parsed.searchParams.get('code_challenge_method')).toBe('S256');
    expect(parsed.searchParams.get('response_type')).toBe('code');
  });

  it('should exchange authorization code in local offline mode', async () => {
    const tokens = await OAuthManager.exchangeAuthCode({
      code: 'test-code-123',
      codeVerifier: 'verifier-123',
      redirectUri: 'http://localhost:8976/oauth/callback',
      localMode: true,
    });

    expect(tokens.accessToken).toMatch(/^mock-oauth-token-/);
    expect(tokens.refreshToken).toMatch(/^mock-refresh-token-/);
    expect(tokens.tokenType).toBe('Bearer');
    expect(tokens.expiresIn).toBe(86400);
  });
});

describe('UserConfigManager & Credential Persistence', () => {
  const testDir = path.join(os.tmpdir(), `cff-test-${Date.now()}`);

  beforeEach(() => {
    UserConfigManager.setCustomConfigDir(testDir);
  });

  afterEach(() => {
    try {
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    } catch {
      // ignore
    }
    UserConfigManager.resetConfigDir();
  });

  it('should save, read, and clear user auth configuration securely', () => {
    expect(UserConfigManager.readUserConfig()).toEqual({});

    UserConfigManager.saveUserConfig({
      apiToken: 'test-token-abcdef',
      refreshToken: 'test-refresh-123',
      tokenType: 'Bearer',
      accountId: 'acc-123',
    });

    const saved = UserConfigManager.readUserConfig();
    expect(saved.apiToken).toBe('test-token-abcdef');
    expect(saved.refreshToken).toBe('test-refresh-123');
    expect(saved.accountId).toBe('acc-123');
    expect(saved.updatedAt).toBeDefined();

    UserConfigManager.clearUserConfig();
    expect(UserConfigManager.readUserConfig()).toEqual({});
  });
});

describe('Auth CLI Commands', () => {
  const testDir = path.join(os.tmpdir(), `cff-auth-cmd-${Date.now()}`);

  beforeEach(() => {
    UserConfigManager.setCustomConfigDir(testDir);
  });

  afterEach(() => {
    try {
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    } catch {
      // ignore
    }
    UserConfigManager.resetConfigDir();
  });

  it('should execute auth login in local offline mode', async () => {
    const cli = createCli();
    cli.exitOverride();
    await expect(
      cli.parseAsync(['node', 'cff', '--local', 'auth', 'login'])
    ).resolves.not.toThrow();

    const saved = UserConfigManager.readUserConfig();
    expect(saved.apiToken).toBeDefined();
    expect(saved.apiToken).toMatch(/^mock-oauth-token-/);
  });

  it('should execute top-level login in local offline mode', async () => {
    const cli = createCli();
    cli.exitOverride();
    await expect(
      cli.parseAsync(['node', 'cff', '--local', 'login'])
    ).resolves.not.toThrow();

    const saved = UserConfigManager.readUserConfig();
    expect(saved.apiToken).toBeDefined();
  });

  it('should execute login with direct token argument in local mode', async () => {
    const cli = createCli();
    cli.exitOverride();
    await expect(
      cli.parseAsync(['node', 'cff', '--local', 'login', 'mock-direct-token-123'])
    ).resolves.not.toThrow();

    const saved = UserConfigManager.readUserConfig();
    expect(saved.apiToken).toBe('mock-direct-token-123');
  });

  it('should execute auth verify with --code flag in local mode', async () => {
    const cli = createCli();
    cli.exitOverride();
    await expect(
      cli.parseAsync(['node', 'cff', '--local', 'auth', 'verify', '--code', 'custom-auth-code'])
    ).resolves.not.toThrow();
  });

  it('should execute auth status command', async () => {
    const cli = createCli();
    cli.exitOverride();
    await expect(
      cli.parseAsync(['node', 'cff', '--local', 'auth', 'status'])
    ).resolves.not.toThrow();
  });

  it('should execute auth permissions command in local mode', async () => {
    const cli = createCli();
    cli.exitOverride();
    await expect(
      cli.parseAsync(['node', 'cff', '--local', 'auth', 'permissions'])
    ).resolves.not.toThrow();
  });

  it('should execute auth permissions with json output', async () => {
    const cli = createCli();
    cli.exitOverride();
    await expect(
      cli.parseAsync(['node', 'cff', '--local', '-o', 'json', 'auth', 'permissions'])
    ).resolves.not.toThrow();
  });

  it('should execute auth logout command and remove config', async () => {
    UserConfigManager.saveUserConfig({ apiToken: 'token-to-delete' });
    expect(UserConfigManager.readUserConfig().apiToken).toBe('token-to-delete');

    const cli = createCli();
    cli.exitOverride();
    await expect(
      cli.parseAsync(['node', 'cff', 'auth', 'logout'])
    ).resolves.not.toThrow();

    expect(UserConfigManager.readUserConfig()).toEqual({});
  });
});

