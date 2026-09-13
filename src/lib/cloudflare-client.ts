import Cloudflare from 'cloudflare';
import { ConfigManager } from '../utils/config.js';
import { createMockCloudflareClient } from './mock-client.js';

let clientInstance: any = null;

export function getCloudflareClient(tokenOverride?: string): Cloudflare {
  const config = ConfigManager.getConfig();

  if (config.localMode) {
    if (!clientInstance || !clientInstance.__isMock) {
      clientInstance = createMockCloudflareClient();
      (clientInstance as any).__isMock = true;
    }
    return clientInstance as unknown as Cloudflare;
  }

  const token = tokenOverride || ConfigManager.requireApiToken();
  
  if (!clientInstance || tokenOverride || (clientInstance as any).__isMock) {
    clientInstance = new Cloudflare({
      apiToken: token,
    });
  }

  return clientInstance as Cloudflare;
}
