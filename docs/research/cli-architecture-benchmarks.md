# CLI Architecture & Tooling Benchmarks

## 1. CLI Framework Evaluation
- **Commander.js (Selected)**: Mature, industry standard, excellent sub-command nested grouping, zero external runtime weight, native TypeScript support.
- **Yargs**: Powerful parsing, but heavier footprint and more verbose configuration.
- **CAC**: Minimalist, but less rich ecosystem for complex hierarchical commands.

## 2. Formatting & Feedback Benchmarks
- **Chalk / Picocolors**: Terminal coloring with auto-detection for non-interactive TTY/pipes.
- **Ora**: Terminal spinner for non-blocking asynchronous user feedback.
- **Console.table / Cli-table3**: Structured tabular display for high-density listing commands.

## 3. Configuration Precedence
1. Explicit CLI Flags (`--token`, `--zone`)
2. Environment Variables (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ZONE_ID`)
3. Project-level `.env` file
4. Machine-level config (`~/.cloudflare-cli/config.json`)
