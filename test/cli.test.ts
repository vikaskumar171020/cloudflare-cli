import { describe, it, expect } from 'vitest';
import { createCli } from '../src/cli.js';

describe('cloudflare-cli', () => {
  it('should initialize commander instance with correct name and commands', () => {
    const cli = createCli();
    expect(cli.name()).toBe('cloudflare-cli');

    const commandNames = cli.commands.map((cmd) => cmd.name());
    expect(commandNames).toContain('auth');
    expect(commandNames).toContain('user:display');
    expect(commandNames).toContain('zones');
    expect(commandNames).toContain('dns');
    expect(commandNames).toContain('workers');
    expect(commandNames).toContain('kv');
    expect(commandNames).toContain('r2');
  });

  it('should execute auth verify in local offline mode without network calls', async () => {
    const cli = createCli();
    cli.exitOverride(); // Prevent process.exit in tests
    await expect(
      cli.parseAsync(['node', 'cloudflare-cli', '--local', 'auth', 'verify'])
    ).resolves.not.toThrow();
  });

  it('should execute user:display in local offline mode', async () => {
    const cli = createCli();
    cli.exitOverride();
    await expect(
      cli.parseAsync(['node', 'cloudflare-cli', '--local', 'user:display'])
    ).resolves.not.toThrow();
  });

  it('should execute zones list in local offline mode with json output', async () => {
    const cli = createCli();
    cli.exitOverride();
    await expect(
      cli.parseAsync(['node', 'cloudflare-cli', '--local', '-o', 'json', 'zones', 'list'])
    ).resolves.not.toThrow();
  });

  it('should execute dns list in local offline mode', async () => {
    const cli = createCli();
    cli.exitOverride();
    await expect(
      cli.parseAsync(['node', 'cloudflare-cli', '--local', 'dns', 'list', '-z', 'mock-zone-001'])
    ).resolves.not.toThrow();
  });

  it('should execute workers list in local offline mode', async () => {
    const cli = createCli();
    cli.exitOverride();
    await expect(
      cli.parseAsync(['node', 'cloudflare-cli', '--local', 'workers', 'list', '-a', 'mock-acc-001'])
    ).resolves.not.toThrow();
  });

  it('should execute kv list in local offline mode', async () => {
    const cli = createCli();
    cli.exitOverride();
    await expect(
      cli.parseAsync(['node', 'cloudflare-cli', '--local', 'kv', 'list', '-a', 'mock-acc-001'])
    ).resolves.not.toThrow();
  });

  it('should execute r2 list in local offline mode', async () => {
    const cli = createCli();
    cli.exitOverride();
    await expect(
      cli.parseAsync(['node', 'cloudflare-cli', '--local', 'r2', 'list', '-a', 'mock-acc-001'])
    ).resolves.not.toThrow();
  });

  it('should execute root help command and print categorized catalog', async () => {
    const cli = createCli();
    cli.exitOverride();
    await expect(
      cli.parseAsync(['node', 'cloudflare-cli', 'help'])
    ).resolves.not.toThrow();
  });

  it('should execute help <subcommand> for dns, zones, auth, workers, kv, r2', async () => {
    const subcommands = ['dns', 'zones', 'auth', 'user:display', 'workers', 'kv', 'r2'];
    for (const sub of subcommands) {
      const cli = createCli();
      cli.exitOverride();
      await expect(
        cli.parseAsync(['node', 'cloudflare-cli', 'help', sub])
      ).resolves.not.toThrow();
    }
  });
});
