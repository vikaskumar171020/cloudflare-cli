# Cloudflare CLI - Master Roadmap

## Vision
Build a modern, robust, high-performance developer CLI for managing the entire Cloudflare ecosystem (DNS, Zones, Workers, KV, R2, Cache, Zero Trust, Pages, and Tunnels) with support for interactive terminal flows, JSON output for CI/CD scripting, and rich telemetry.

---

## Phase 1: MVP Core (Current)
- [x] Project scaffolding (TypeScript, ES Modules, Commander, Vitest).
- [x] Agentic development rules (`AGENTS.md`, `.agents/rules/`, `.agents/skills/`).
- [x] Docs architecture (`plans/`, `research/`, `architecture/`, `rfc/`).
- [x] Authentication and configuration (`cf-cli auth verify`, `cf-cli user:display`).
- [x] Zone operations (`cf-cli zones list`, `cf-cli zones get`).
- [x] DNS record management (`cf-cli dns list`, `cf-cli dns create`, `cf-cli dns delete`).
- [x] Core resource inspection (`workers list`, `kv list`, `r2 list`).

---

## Phase 2: Advanced Cloudflare Resource Management
- [ ] **Workers & Pages**: Deploy scripts, manage bindings, inspect logs (tailing).
- [ ] **KV & R2 Storage**: Key-value CRUD operations, R2 upload/download/sync.
- [ ] **Cache Management**: Purge all cache, purge by URL, purge by Cache-Tag.
- [ ] **Firewall & Security**: WAF rules, IP Access Rules, Rate Limiting configuration.
- [ ] **Cloudflare Tunnel (cloudflared)**: Tunnel configuration, listing, and routing management.

---

## Phase 3: Developer Experience & CI/CD
- [ ] Profile management (`cf-cli profile switch <name>`, multiple account support).
- [ ] System keyring storage for secure API token storage (e.g. `keytar`).
- [ ] Shell autocompletion scripts (bash, zsh, fish).
- [ ] GitHub Actions and CI/CD integration plugins.
