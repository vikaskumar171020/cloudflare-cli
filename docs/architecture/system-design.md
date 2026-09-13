# System Architecture Design

## 1. High-Level Architecture

```text
+-----------------------------------------------------------------+
|                        Terminal / User                          |
+-----------------------------------------------------------------+
                                |
                                v
+-----------------------------------------------------------------+
|                       src/index.ts                              |
|                    (CLI Executable Entry)                       |
+-----------------------------------------------------------------+
                                |
                                v
+-----------------------------------------------------------------+
|                        src/cli.ts                               |
|                (Commander Program Registration)                 |
+-----------------------------------------------------------------+
       |              |             |            |           |
       v              v             v            v           v
  +---------+   +----------+   +---------+  +---------+  +--------+
  |  auth/  |   |  zones/  |   |  dns/   |  |workers/ |  |kv & r2 |
  +---------+   +----------+   +---------+  +---------+  +--------+
       \              \             |            /           /
        \              \            |           /           /
         +--------------------------+----------------------+
                                |
                                v
                 +-----------------------------+
                 |    src/lib/cloudflare-      |
                 |          client.ts          |
                 +-----------------------------+
                                |
                                v
                 +-----------------------------+
                 |  Cloudflare REST API (v4)   |
                 +-----------------------------+
```

## 2. Key Subsystems
- **Config & Auth**: Manages credentials, tokens, environment variables with strict runtime validation.
- **Output Formatter**: Generates human-friendly tables or machine-parseable JSON/YAML.
- **Logger & Spinner**: Asynchronous feedback loop preventing deadlocks or silent pauses.
- **Command Modules**: Self-contained directories exposing domain commands.
