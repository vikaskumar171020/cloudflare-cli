import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export interface UserAuthConfig {
  apiToken?: string;
  refreshToken?: string;
  tokenType?: string;
  expiresAt?: number;
  accountId?: string;
  zoneId?: string;
  email?: string;
  updatedAt?: string;
}

export class UserConfigManager {
  private static configDir = path.join(os.homedir(), '.cfcli');
  private static configFile = path.join(os.homedir(), '.cfcli', 'config.json');

  public static getConfigPath(): string {
    return this.configFile;
  }

  public static setCustomConfigDir(dir: string): void {
    this.configDir = dir;
    this.configFile = path.join(dir, 'config.json');
  }

  public static resetConfigDir(): void {
    this.configDir = path.join(os.homedir(), '.cfcli');
    this.configFile = path.join(os.homedir(), '.cfcli', 'config.json');
  }

  public static readUserConfig(): UserAuthConfig {
    try {
      if (!fs.existsSync(this.configFile)) {
        return {};
      }
      const raw = fs.readFileSync(this.configFile, 'utf-8');
      return JSON.parse(raw) as UserAuthConfig;
    } catch {
      return {};
    }
  }

  public static saveUserConfig(updates: Partial<UserAuthConfig>): void {
    try {
      if (!fs.existsSync(this.configDir)) {
        fs.mkdirSync(this.configDir, { recursive: true, mode: 0o700 });
      }

      const existing = this.readUserConfig();
      const merged: UserAuthConfig = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      fs.writeFileSync(this.configFile, JSON.stringify(merged, null, 2), {
        mode: 0o600,
      });
    } catch (error) {
      throw new Error(`Failed to write user config to ${this.configFile}: ${(error as Error).message}`);
    }
  }

  public static clearUserConfig(): void {
    try {
      if (fs.existsSync(this.configFile)) {
        fs.unlinkSync(this.configFile);
      }
    } catch (error) {
      throw new Error(`Failed to remove user config: ${(error as Error).message}`);
    }
  }
}
