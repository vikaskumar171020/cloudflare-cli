import Cloudflare from 'cloudflare';
import { ConfigManager } from '../utils/config.js';

let clientInstance: Cloudflare | null = null;

export function getCloudflareClient(tokenOverride?: string): Cloudflare {
  const token = tokenOverride || ConfigManager.requireApiToken();
  
  if (!clientInstance || tokenOverride) {
    clientInstance = new Cloudflare({
      apiToken: token,
    });
  }

  return clientInstance;
}
