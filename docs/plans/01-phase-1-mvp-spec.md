# Phase 1 MVP Specification

## 1. Overview
The MVP of `cloudflare-cli` establishes the core project structure, CLI entrypoints, authentication subsystem, zone and DNS query/mutation commands, and initial workers/storage listing capabilities.

## 2. Supported Commands
- `cf-cli auth verify`: Tests and validates API token.
- `cf-cli whoami`: Fetches Cloudflare account/user details.
- `cf-cli zones list [--name <name>] [--status <status>]`: Lists all domain zones.
- `cf-cli zones get <zoneId>`: Displays detailed zone status and nameservers.
- `cf-cli dns list -z <zoneId> [-t <type>] [-n <name>]`: Lists DNS records.
- `cf-cli dns create -z <zoneId> -t <type> -n <name> -c <content> [-p] [--ttl <ttl>]`: Creates a DNS record.
- `cf-cli dns delete <recordId> -z <zoneId>`: Deletes a DNS record.
- `cf-cli workers list -a <accountId>`: Lists worker scripts.
- `cf-cli kv list -a <accountId>`: Lists KV namespaces.
- `cf-cli r2 list -a <accountId>`: Lists R2 buckets.

## 3. Global Flags
- `-t, --token <token>`: Cloudflare API token.
- `-a, --account <accountId>`: Cloudflare account ID.
- `-z, --zone <zoneId>`: Cloudflare zone ID.
- `-o, --output <table|json|yaml|csv>`: Output formatting.
- `-v, --verbose`: Detailed debug logs.
