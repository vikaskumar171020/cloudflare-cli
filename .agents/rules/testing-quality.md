# Testing & Quality Guidelines

1. **Unit Testing**:
   - Write tests using `vitest`.
   - Place test files under `test/` (e.g. `test/commands/dns.test.ts`, `test/cli.test.ts`).
   - Mock network / Cloudflare API responses in unit tests to ensure fast, deterministic CI.

2. **Docker Containerized Testing**:
   - Run tests inside isolated Alpine container using `npm run docker:test` or `docker compose run --rm test`.
   - Run full verification (type check + lint + tests) with `npm run docker:test:all`.
   - Ensure `Dockerfile` multi-stage targets (`deps`, `test`, `builder`, `runner`) stay up to date when adding dependencies.

3. **Linting & Type Checking**:
   - Run `npm run lint` (`tsc --noEmit`) to verify zero TypeScript errors.
   - Run `npm test` before concluding tasks.
