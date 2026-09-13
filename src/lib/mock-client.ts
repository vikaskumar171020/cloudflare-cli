/**
 * In-Memory Mock Cloudflare Client for Local / Offline Testing.
 * Provides deterministic simulation of Cloudflare API responses without network requests.
 */
export function createMockCloudflareClient() {
  const mockZones = [
    {
      id: 'mock-zone-001',
      name: 'example.com',
      status: 'active',
      plan: { name: 'Pro Plan' },
      account: { id: 'mock-acc-001', name: 'Local Dev Account' },
      name_servers: ['ns1.cloudflare.com', 'ns2.cloudflare.com'],
    },
    {
      id: 'mock-zone-002',
      name: 'staging-app.dev',
      status: 'active',
      plan: { name: 'Free Plan' },
      account: { id: 'mock-acc-001', name: 'Local Dev Account' },
      name_servers: ['ns3.cloudflare.com', 'ns4.cloudflare.com'],
    },
  ];

  const mockDnsRecords = [
    {
      id: 'mock-dns-001',
      zone_id: 'mock-zone-001',
      type: 'A',
      name: 'api.example.com',
      content: '192.0.2.1',
      proxied: true,
      ttl: 1,
    },
    {
      id: 'mock-dns-002',
      zone_id: 'mock-zone-001',
      type: 'CNAME',
      name: 'www.example.com',
      content: 'example.com',
      proxied: true,
      ttl: 1,
    },
    {
      id: 'mock-dns-003',
      zone_id: 'mock-zone-001',
      type: 'TXT',
      name: 'example.com',
      content: 'v=spf1 include:_spf.mock.com ~all',
      proxied: false,
      ttl: 3600,
    },
  ];

  return {
    user: {
      tokens: {
        verify: async () => ({
          id: 'mock-token-id-987654321',
          status: 'active',
          expires_on: '2099-12-31T23:59:59Z',
        }),
      },
      get: async () => ({
        id: 'mock-user-123456',
        first_name: 'Local',
        last_name: 'Developer',
        country: 'US',
        two_factor_authentication_enabled: true,
        suspended: false,
      }),
    },
    zones: {
      list: async (params?: { name?: string; status?: string }) => {
        let results = [...mockZones];
        if (params?.name) {
          results = results.filter((z) => z.name.toLowerCase().includes(params.name!.toLowerCase()));
        }
        if (params?.status) {
          results = results.filter((z) => z.status.toLowerCase() === params.status!.toLowerCase());
        }
        return { result: results };
      },
      get: async (params: { zone_id: string }) => {
        const zone = mockZones.find((z) => z.id === params.zone_id) || mockZones[0];
        return zone;
      },
    },
    dns: {
      records: {
        list: async (params: { zone_id: string; type?: string; name?: string }) => {
          let records = [...mockDnsRecords];
          if (params.type) {
            records = records.filter((r) => r.type.toUpperCase() === params.type!.toUpperCase());
          }
          if (params.name) {
            records = records.filter((r) => r.name.toLowerCase().includes(params.name!.toLowerCase()));
          }
          return { result: records };
        },
        create: async (params: {
          zone_id: string;
          type: string;
          name: string;
          content: string;
          proxied?: boolean;
          ttl?: number;
        }) => {
          const newRecord = {
            id: `mock-dns-${Date.now()}`,
            zone_id: params.zone_id,
            type: params.type,
            name: params.name,
            content: params.content,
            proxied: Boolean(params.proxied),
            ttl: params.ttl || 1,
          };
          return newRecord;
        },
        delete: async (recordId: string, _params: { zone_id: string }) => ({
          id: recordId,
        }),
      },
    },
    workers: {
      scripts: {
        list: async (_params: { account_id: string }) => ({
          result: [
            {
              id: 'mock-auth-worker',
              created_on: '2026-01-01T00:00:00Z',
              modified_on: '2026-09-01T12:00:00Z',
              usage_model: 'standard',
            },
            {
              id: 'mock-api-gateway',
              created_on: '2026-02-15T00:00:00Z',
              modified_on: '2026-09-10T14:30:00Z',
              usage_model: 'bundled',
            },
          ],
        }),
      },
    },
    kv: {
      namespaces: {
        list: async (_params: { account_id: string }) => ({
          result: [
            {
              id: 'mock-kv-ns-001',
              title: 'LOCAL_SESSION_STORE',
              supports_url_encoding: true,
            },
            {
              id: 'mock-kv-ns-002',
              title: 'LOCAL_FEATURE_FLAGS',
              supports_url_encoding: false,
            },
          ],
        }),
      },
    },
    r2: {
      buckets: {
        list: async (_params: { account_id: string }) => ({
          buckets: [
            {
              name: 'local-assets-bucket',
              creation_date: '2026-03-01T10:00:00Z',
              location: 'us-east-1',
            },
            {
              name: 'local-backup-storage',
              creation_date: '2026-05-12T16:20:00Z',
              location: 'default',
            },
          ],
        }),
      },
    },
  };
}
