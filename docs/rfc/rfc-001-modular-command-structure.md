# RFC-001: Modular Command Structure

- **Status**: Accepted
- **Author**: Antigravity Dev
- **Date**: 2026-09-13

## Summary
Proposes standardizing all `cloudflare-cli` commands into domain-isolated modules under `src/commands/<domain>/index.ts` with a uniform registration interface `register<Domain>Commands(program: Command)`.

## Motivation
As Cloudflare provides dozens of services (DNS, Workers, Pages, R2, D1, Queues, Vectorize, Hyperdrive, Zero Trust, WAF, Tunnels), a monolithic command file quickly becomes unmaintainable.

## Design
Each subcommand directory contains:
- `index.ts`: Command definitions, flags, and actions.
- `types.ts` (optional): Command-specific payload interfaces.
- `formatters.ts` (optional): Dedicated table/JSON formatters.
