# System Architecture Design

```mermaid
sequenceDiagram
    autonumber
    actor Operator as Terminal / CI User
    participant Entry as Entrypoint (src/index.ts)
    participant Program as CLI Framework (src/cli.ts)
    participant Modules as Domain Subcommands (src/commands/*)
    participant Client as SDK Wrapper (src/lib/cloudflare-client.ts)
    participant Cloudflare as Cloudflare API v4 / Local Mock

    Operator->>Entry: Run cloudflare-cli <args>
    Entry->>Program: parseAsync(argv)
    Program->>Program: Parse global options & initialize ConfigManager
    Program->>Modules: Route to target domain handler (auth, zones, dns, workers, kv, r2)
    Modules->>Client: getCloudflareClient()
    Client->>Cloudflare: REST API / In-Memory Mock Dispatch
    Cloudflare-->>Client: Typed Resource Response
    Client-->>Modules: Payload Data
    Modules->>Operator: Formatted Table / JSON Output
```

## 2. Key Subsystems
- **Config & Auth**: Manages credentials, tokens, environment variables with strict runtime validation.
- **Output Formatter**: Generates human-friendly tables or machine-parseable JSON/YAML.
- **Logger & Spinner**: Asynchronous feedback loop preventing deadlocks or silent pauses.
- **Command Modules**: Self-contained directories exposing domain commands.

---

## 3. Command Execution Sequence

```mermaid
sequenceDiagram
    autonumber
    actor User as Operator / CI Pipeline
    participant CLI as CLI Program (src/cli.ts)
    participant Config as ConfigManager (src/utils/config.ts)
    participant Handler as Command Handler (src/commands/*)
    participant Logger as Logger / Spinner (src/utils/logger.ts)
    participant SDK as Cloudflare Client (src/lib/cloudflare-client.ts)
    participant CF as Cloudflare API v4

    User->>CLI: Execute Command (e.g., cf-cli dns create ...)
    CLI->>Config: loadConfig(flags, env, .env)
    Config-->>CLI: Validated Configuration (token, format, ids)

    CLI->>Handler: Dispatch Command Action
    Handler->>Logger: Logger.spinner("Creating DNS record...")
    Logger-->>User: Render live CLI spinner

    Handler->>SDK: getCloudflareClient()
    SDK->>CF: HTTP Request (Bearer Auth + Payload)
    CF-->>SDK: HTTP Response (JSON data)
    SDK-->>Handler: Return Typed SDK Object

    alt Success
        Handler->>Logger: spinner.succeed("Operation complete")
        Handler->>Logger: Format Output (Table / JSON / YAML)
        Logger-->>User: Render structured data to stdout
    else Error (API / Auth / Validation)
        Handler->>Logger: spinner.fail("Operation failed")
        Handler->>Logger: Logger.error(message, error)
        Logger-->>User: Render formatted error to stderr (Exit Code 1)
    end
```
