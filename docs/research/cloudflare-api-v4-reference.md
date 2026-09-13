# Cloudflare API v4 Reference & Best Practices

## 1. Authentication Options
- **API Tokens (Recommended)**: Fine-grained, scoped permissions per resource/zone.
  - Header: `Authorization: Bearer <API_TOKEN>`
- **Global API Key (Legacy/Deprecated)**:
  - Headers: `X-Auth-Key: <GLOBAL_KEY>`, `X-Auth-Email: <EMAIL>`

## 2. Token Permission Scopes Matrix
| Operation | Required Token Scope | Resource Scope |
| :--- | :--- | :--- |
| `zones.list` | `Zone.Zone:Read` | All Zones or Specific Account |
| `dns.records.list / create / delete` | `Zone.DNS:Edit` | Specific Zone |
| `workers.scripts.list` | `Account.Workers Scripts:Edit` | Specific Account |
| `kv.namespaces.list` | `Account.Workers KV Storage:Edit` | Specific Account |
| `r2.buckets.list` | `Account.Workers R2 Storage:Edit` | Specific Account |

## 3. Rate Limiting & Pagination
- Default limit: 1200 requests per 5-minute period per user token.
- Pagination: Cloudflare APIs use page-based pagination (`page`, `per_page` up to 50 or 100).
- The official `cloudflare` v4 TypeScript SDK provides built-in pagination iterators (`for await (const page of client.zones.list(...))`).
