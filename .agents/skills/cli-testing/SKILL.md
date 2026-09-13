---
name: cli-testing
description: Guidelines and recipes for testing Commander.js CLI commands and Cloudflare SDK integrations using Vitest.
---

# CLI Testing Skill

## Testing Strategies

### 1. Commander Unit Testing
- Test command registration without invoking network calls.
- Inspect `program.commands` array and option definitions.

### 2. Integration / Mock Testing
- Mock `getCloudflareClient()` or the `cloudflare` package using Vitest:
  ```typescript
  import { vi, describe, it, expect } from 'vitest';
  
  vi.mock('../src/lib/cloudflare-client.js', () => ({
    getCloudflareClient: () => ({
      zones: {
        list: vi.fn().mockResolvedValue({ result: [] })
      }
    })
  }));
  ```

### 3. Docker Containerized Testing
- Run test suite in an isolated Alpine container:
  ```bash
  npm run docker:test
  # Or with compose directly:
  docker compose run --rm test
  ```
- Run full verification (linting + tests) inside Docker:
  ```bash
  npm run docker:test:all
  ```
- Test CLI commands inside container:
  ```bash
  docker compose run --rm cli zones list
  ```
