# Cloudflare API Guidelines

1. **Client Singleton**:
   - Use `getCloudflareClient()` from `src/lib/cloudflare-client.ts`. Do not instantiate `new Cloudflare()` directly across commands.

2. **Pagination**:
   - Cloudflare APIs paginate results (default 20 to 50 items per page).
   - Use auto-pagination where available or pass pagination parameters (`page`, `per_page: 50`) for commands listing resources.

3. **API Scopes & Permissions**:
   - Cloudflare API Tokens require specific permissions depending on the operation:
     - `Zone:Read` / `DNS:Edit` for DNS management
     - `Workers Scripts:Edit` for Workers
     - `Workers KV Storage:Edit` for KV
     - `Workers R2 Storage:Edit` for R2
   - If an unauthorized response (HTTP 401/403) is returned, remind the user to check their API Token permissions.
