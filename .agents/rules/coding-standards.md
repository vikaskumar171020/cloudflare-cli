# Coding Standards for Cloudflare CLI

## TypeScript Best Practices
- **ES Modules**: Use `.js` extension when importing local TS files (NodeNext resolution).
- **Strict Typing**: Avoid `any`. Define strong interfaces in `src/types/` or command-specific types.
- **Async/Await**: Always use async/await over raw `.then()` chains.
- **Error Handling**: Wrap top-level CLI actions with `try...catch` and handle API exceptions gracefully through `Logger.error`.
- **Modularity**: Each domain (dns, zones, workers, kv, r2) lives in its own subdirectory inside `src/commands/` exporting a registration function `register<Domain>Commands(program: Command)`.
