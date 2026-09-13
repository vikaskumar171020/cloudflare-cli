# Cloudflare CLI Documentation

Welcome to the documentation repository for `cloudflare-cli`. This folder organizes all architectural plans, technical research, system designs, and Request for Comments (RFCs).

## Directory Structure

```text
docs/
├── architecture/          # High-level system architecture and security designs
│   ├── auth-and-security.md
│   └── system-design.md
├── plans/                 # Execution roadmaps, sprint plans, and feature specs
│   ├── 00-master-roadmap.md
│   ├── 01-phase-1-mvp-spec.md
│   └── template-plan.md
├── research/              # Technical spikes, API evaluations, and benchmarks
│   ├── cli-architecture-benchmarks.md
│   ├── cloudflare-api-v4-reference.md
│   └── template-research.md
└── rfc/                   # Request for Comments / Design proposals
    └── rfc-001-modular-command-structure.md
```

## Guides & Resources
- **[Developer & Testing Guide](../DEVELOPER_GUIDE.md)**: End-to-end installation, testing directly from source code, and Docker workflows.
- **[Docker Guide](../DOCKER.md)**: Complete Docker commands, container architecture, and offline local mode.
- **[Master Roadmap](plans/00-master-roadmap.md)**: Complete development milestones.

## How to Use
- **Planning New Features**: Copy `docs/plans/template-plan.md` to a new plan in `docs/plans/`.
- **Conducting Spikes / Research**: Use `docs/research/template-research.md` to document findings before implementation.
- **Architectural Changes**: Submit an RFC under `docs/rfc/`.
