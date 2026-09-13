# Cloudflare CLI - AGY Rules & Guidelines

Please refer to [AGENTS.md](file:///Volumes/MacDisk/Docker-Projects/cloudflare-cli/AGENTS.md) for primary agent rules, stack overview, and project structure.

## Quick CLI Rules:
- All commands must support `--output table|json|yaml`.
- All async operations must provide visual spinner feedback (`Logger.spinner`).
- Use strict TypeScript typing with zero `any` where possible.
- Run tests (`npm test`) and type check (`npm run lint`) before concluding tasks.
