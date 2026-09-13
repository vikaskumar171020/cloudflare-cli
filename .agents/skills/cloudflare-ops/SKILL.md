---
name: cloudflare-ops
description: Operational runbooks, API patterns, and troubleshooting steps for Cloudflare services (DNS, Workers, KV, R2, Zones, and Cache). Use when developing or executing Cloudflare operations via CLI or SDK.
---

# Cloudflare Ops Skill

This skill provides reference patterns for managing Cloudflare services via the official Cloudflare SDK and CLI.

## Common Operations

### 1. Zone & DNS Management
- To list zones: `client.zones.list()`
- To list DNS records: `client.dns.records.list({ zone_id })`
- To create a record:
  ```typescript
  await client.dns.records.create({
    zone_id: '...',
    type: 'A',
    name: 'subdomain.example.com',
    content: '1.2.3.4',
    proxied: true,
    ttl: 1, // Auto
  });
  ```

### 2. Workers & KV
- List worker scripts: `client.workers.scripts.list({ account_id })`
- List KV namespaces: `client.kv.namespaces.list({ account_id })`

### 3. R2 Storage
- List buckets: `client.r2.buckets.list({ account_id })`

## Error Handling Patterns
- **401 Unauthorized**: Invalid API token or missing scope.
- **404 Not Found**: Resource ID or Zone ID incorrect.
- **429 Rate Limit**: Implement exponential backoff.
