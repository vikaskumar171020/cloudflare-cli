# Authentication & Security Architecture

## 1. Threat Model & Principles
- **Credential Protection**: API tokens grant powerful access to DNS and Cloudflare infrastructure. Under no condition should tokens be committed to git, logged to console, or written to public files.
- **Least Privilege Principle**: Recommend API Tokens scoped exclusively to specific zones and permissions instead of Global API Keys.
- **Safe Defaults**: Destructive commands require explicit flags or confirmations.

## 2. Token Resolution Order
1. CLI Argument: `--token <TOKEN>`
2. Environment Variable: `CLOUDFLARE_API_TOKEN`
3. Local `.env` file in current working directory
4. (Future) Encrypted credential storage via OS keyring
