# Cloudflare CLI - Developer & Testing Guide

This guide is a comprehensive manual for developers and QA engineers looking to install, build, test, and debug `cloudflare-cli` directly from the source code, local tarballs, or isolated Docker containers.

---

## Table of Contents
1. [Prerequisites & Environment Setup](#1-prerequisites--environment-setup)
2. [Testing Directly From Source Code](#2-testing-directly-from-source-code)
   - [Method A: Instant Execution via `tsx` (No Build Step)](#method-a-instant-execution-via-tsx-no-build-step)
   - [Method B: Compile & Global Symlink (`npm link`)](#method-b-compile--global-symlink-npm-link)
   - [Method C: Production Tarball Simulation (`npm pack`)](#method-c-production-tarball-simulation-npm-pack)
   - [Method D: In-Code Programmatic Testing](#method-d-in-code-programmatic-testing)
3. [Automated Test Suite (Vitest)](#3-automated-test-suite-vitest)
   - [Running Unit Tests](#running-unit-tests)
   - [Mocking Cloudflare API Responses](#mocking-cloudflare-api-responses)
   - [Type Checking & Static Analysis](#type-checking--static-analysis)
4. [Docker Containerized Testing Workflows](#4-docker-containerized-testing-workflows)
   - [Run Isolated Test Suite](#run-isolated-test-suite)
   - [Run Full Verification (Lint + Tests)](#run-full-verification-lint--tests)
   - [Execute Containerized Production Binary](#execute-containerized-production-binary)
5. [Command-by-Command Testing Matrix](#5-command-by-command-testing-matrix)
6. [Troubleshooting & Debugging](#6-troubleshooting--debugging)

---

## 1. Prerequisites & Environment Setup

### System Requirements
- **Node.js**: `>= 20.0.0` (check with `node --version`)
- **npm**: `>= 10.0.0` (check with `npm --version`)
- **Docker & Docker Compose** (optional, for containerized tests)

### Initial Setup
```bash
# 1. Clone the repository
git clone <repo-url>
cd cloudflare-cli

# 2. Install dependencies
npm install

# 3. Create your local .env configuration
cp .env.example .env
```

Configure your `.env` file:
```ini
# Real Cloudflare token or mock token for testing
CLOUDFLARE_API_TOKEN=your_token_here
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
CLOUDFLARE_ZONE_ID=your_zone_id_here
CLOUDFLARE_CLI_OUTPUT_FORMAT=table
```

---

## 2. Testing Directly From Source Code

There are four primary ways a developer can test the CLI during development:

### Method A: Instant Execution via `tsx` (No Build Step)
The fastest workflow for rapid iteration without compiling TypeScript files:

```bash
# Run help
npm run dev -- --help

# Test authentication
npm run dev -- auth verify

# Test zone listing with table output
npm run dev -- zones list

# Test JSON output mode with verbose logging
npm run dev -- -v -o json zones list
```

---

### Method B: Compile & Global Symlink (`npm link`)
Tests the compiled output (`dist/index.js`) as an installed global binary on your local machine:

```bash
# 1. Build the TypeScript codebase
npm run build

# 2. Symlink the package globally
npm link

# 3. Now run the CLI binary directly from any terminal window
cloudflare-cli --help
cf-cli user:display
cloudflare-cli dns list -z <zoneId>

# 4. When finished, you can unlink it
npm unlink -g cloudflare-cli
```

---

### Method C: Production Tarball Simulation (`npm pack`)
Simulates installing the CLI from the npm registry without publishing:

```bash
# 1. Build project
npm run build

# 2. Create a distribution tarball
npm pack
# Generates cloudflare-cli-0.1.0.tgz

# 3. Test global installation from the tarball
npm install -g ./cloudflare-cli-0.1.0.tgz

# 4. Verify global execution
cloudflare-cli --version

# 5. Clean up
npm uninstall -g cloudflare-cli
rm cloudflare-cli-0.1.0.tgz
```

---

### Method D: Standalone Package & macOS DMG Generation (`npm run package`)
Generates standalone tarballs, installer scripts, and a native macOS `.dmg` disk image:

```bash
# Build standalone package + macOS DMG image
npm run package

# Artifacts created in build_artifacts/:
# - cloudflare-cli-0.1.0.tgz (npm distribution)
# - cloudflare-cli-v0.1.0-macos.dmg (macOS installer DMG)
# - cloudflare-cli-v0.1.0-package.tar.gz (standalone tarball with installer)
```

---

### Method E: In-Code Programmatic Testing
You can instantiate and execute the CLI inside test scripts or Node code:

```typescript
import { createCli } from './src/cli.js';

async function testCliProgrammatically() {
  const cli = createCli();

  // Simulate command arguments
  const exitCode = await cli.parseAsync([
    'node',
    'cloudflare-cli',
    'dns',
    'list',
    '--zone',
    'example-zone-id',
    '--output',
    'json',
  ]);

  console.log('CLI execution finished.');
}

testCliProgrammatically();
```

---

## 3. Automated Test Suite (Vitest)

We use [Vitest](https://vitest.dev/) for unit and integration tests.

### Running Unit Tests
```bash
# Run all tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch
```

### Mocking Cloudflare API Responses
For offline deterministic testing, mock `getCloudflareClient()` in your test files:

```typescript
// test/commands/dns.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createCli } from '../src/cli.js';

// Mock Cloudflare SDK client
vi.mock('../src/lib/cloudflare-client.js', () => ({
  getCloudflareClient: () => ({
    dns: {
      records: {
        list: vi.fn().mockResolvedValue({
          result: [
            {
              id: 'mock-rec-1',
              type: 'A',
              name: 'api.example.com',
              content: '1.2.3.4',
              proxied: true,
              ttl: 1,
            },
          ],
        }),
      },
    },
  }),
}));

describe('DNS Command Module', () => {
  it('should list DNS records successfully', async () => {
    const cli = createCli();
    await expect(
      cli.parseAsync(['node', 'cloudflare-cli', 'dns', 'list', '-z', 'dummy-zone'])
    ).resolves.not.toThrow();
  });
});
```

### Type Checking & Static Analysis
Verify strict TypeScript types with zero `any` leaks:
```bash
npm run lint
```

---

## 4. Docker Containerized Testing Workflows

Docker ensures clean, isolated test runs identical to CI/CD environments.

### Run Isolated Test Suite
Executes the Vitest test suite inside a Node 22 Alpine container:
```bash
npm run docker:test
# Or directly via docker compose:
docker compose run --rm test
```

### Run Full Verification (Lint + Tests)
Runs both TypeScript type checking (`tsc --noEmit`) and the test suite:
```bash
npm run docker:test:all
```

### Execute Containerized Production Binary
Runs the fully built, multi-stage production runner image:
```bash
# Display help
docker compose run --rm cli --help

# Run user:display against your .env token
docker compose run --rm cli user:display

# List zones inside container
docker compose run --rm cli zones list
```

---

## 5. Command-by-Command Testing Matrix

| Subcommand | Test Command (via `npm run dev`) | Expected Behavior |
| :--- | :--- | :--- |
| **Help** | `npm run dev -- --help` | Prints root usage, global flags, and list of subcommands. |
| **Auth Verify** | `npm run dev -- auth verify` | Returns token verification status (`valid` / `active`). |
| **User Display** | `npm run dev -- user:display` | Displays user details, ID, country, and 2FA status (alias: `whoami`). |
| **Zones List** | `npm run dev -- zones list` | Outputs ASCII table of zones with ID, Name, Plan, and Status. |
| **Zones Filter** | `npm run dev -- zones list --name example.com` | Filters zones by exact/partial domain name. |
| **DNS List** | `npm run dev -- dns list -z <zoneId>` | Prints DNS records (A, CNAME, TXT) with proxy & TTL columns. |
| **DNS Create** | `npm run dev -- dns create -z <zoneId> -t A -n sub -c 1.2.3.4 -p` | Creates record with proxy enabled and returns new Record ID. |
| **DNS Delete** | `npm run dev -- dns delete <recordId> -z <zoneId>` | Deletes record and displays confirmation message. |
| **Workers List** | `npm run dev -- workers list -a <accountId>` | Lists deployed Workers scripts and usage model. |
| **KV List** | `npm run dev -- kv list -a <accountId>` | Lists KV storage namespaces. |
| **R2 List** | `npm run dev -- r2 list -a <accountId>` | Lists R2 object storage buckets and creation timestamps. |
| **JSON Output** | `npm run dev -- -o json zones list` | Outputs pure JSON array for automation (`jq`). |
| **Verbose Mode** | `npm run dev -- -v user:display` | Displays detailed debug logs and stack traces on error. |

---

## 6. Troubleshooting & Debugging

### Common Issues

1. **`Missing Cloudflare API Token`**
   - **Cause**: No `--token` flag passed and `CLOUDFLARE_API_TOKEN` is not set.
   - **Solution**: Pass `-t <TOKEN>` or set `CLOUDFLARE_API_TOKEN=...` in your `.env` file.

2. **`HTTP 401 / 403 Unauthorized`**
   - **Cause**: The API Token does not have the required permissions for the requested resource.
   - **Solution**: Check [docs/research/cloudflare-api-v4-reference.md](docs/research/cloudflare-api-v4-reference.md) and ensure your token has scopes like `Zone:Read`, `DNS:Edit`, or `Workers:Edit`.

3. **`Zone ID is required`**
   - **Cause**: DNS command invoked without a Zone ID.
   - **Solution**: Provide `--zone <zoneId>` or set `CLOUDFLARE_ZONE_ID` in `.env`.

4. **Docker connection error (`docker.sock`)**
   - **Cause**: Docker Desktop daemon is not running on the host machine.
   - **Solution**: Start Docker Desktop and re-run `npm run docker:test`.

---

## Related Documentation
- [Project Readme](README.md)
- [Master Roadmap](docs/plans/00-master-roadmap.md)
- [CLI Architecture & System Design](docs/architecture/system-design.md)
- [Antigravity AGY Agent Guidelines](AGENTS.md)
