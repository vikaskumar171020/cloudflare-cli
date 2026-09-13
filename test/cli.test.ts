import { describe, it, expect } from 'vitest';
import { createCli } from '../src/cli.js';

describe('cloudflare-cli', () => {
  it('should initialize commander instance with correct name and commands', () => {
    const cli = createCli();
    expect(cli.name()).toBe('cloudflare-cli');

    const commandNames = cli.commands.map((cmd) => cmd.name());
    expect(commandNames).toContain('auth');
    expect(commandNames).toContain('whoami');
    expect(commandNames).toContain('zones');
    expect(commandNames).toContain('dns');
    expect(commandNames).toContain('workers');
    expect(commandNames).toContain('kv');
    expect(commandNames).toContain('r2');
  });
});
