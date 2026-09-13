# Antigravity Agent Guidelines for `cloudflare-cli`

Welcome to the `cloudflare-cli` repository. When building features, debugging, refactoring, or planning tasks, follow these operational standards.

---

## 1. Project Philosophy & Stack
- **Language**: TypeScript (NodeNext / ES Modules), Node.js >= 20.
- **Framework**: `commander` for CLI structure, `cloudflare` (official Cloudflare Node SDK v4) for API operations.
- **Output & Logging**: Chalk for styling, Ora for spinners, structured tables for tabular output, JSON mode for automation pipelines (`--output json`).
- **Validation**: `zod` for argument/config parsing and runtime validation.

---

## 2. Code Organization
- `src/index.ts`: Executable entrypoint.
- `src/cli.ts`: Top-level CLI configuration and subcommand registration.
- `src/commands/`: Domain-specific subcommands (e.g. `auth`, `dns`, `zones`, `workers`, `kv`, `r2`).
- `src/lib/`: Cloudflare API client wrappers, authentication mechanisms, and external integrations.
- `src/utils/`: Common utilities (logger, spinners, table formatters, config loaders).
- `src/types/`: Shared TypeScript interfaces and domain types.
- `docs/`: Plans, research, architectural decision records, and RFCs.

---

## 3. Security & API Token Rules
- **NEVER hardcode API keys or tokens in code or docs.**
- Always retrieve tokens via CLI flags (`--token`), environment variables (`CLOUDFLARE_API_TOKEN`), or standard config files (`.env`).
- For destructive operations (e.g. deleting DNS records, purging cache, deleting buckets), implement interactive confirmation prompts or require `--force`/`--confirm` flags.

---

## 4. Documentation & Agentic Workflow
- Update [docs/plans/](file:///Volumes/MacDisk/Docker-Projects/cloudflare-cli/docs/plans) when creating or executing development roadmaps.
- Record API investigations and trade-offs in [docs/research/](file:///Volumes/MacDisk/Docker-Projects/cloudflare-cli/docs/research).
- Consult `.agents/skills/` for operational runbooks and testing procedures.
