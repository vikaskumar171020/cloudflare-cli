# CLI User Experience (UX) Standards

1. **Feedback & Spinners**:
   - Long running requests (network requests, Cloudflare API calls) must show an Ora spinner with an informative label.
   - Stop spinners with `.succeed()` or `.fail()` before outputting data or errors.

2. **Output Formatting**:
   - By default, format list outputs using readable tables or bullet points.
   - Honor `--output json` flag so output can be piped cleanly to `jq` or CI/CD pipelines.

3. **Confirmation for Destructive Actions**:
   - Operations that delete or purge resources (DNS records, Workers scripts, R2 buckets, Cache purge) should support `--force` / `--yes` flags for non-interactive execution, but warn the user in interactive mode.

4. **Helpful Error Messages**:
   - Suggest actionable next steps when errors occur (e.g. missing API token, invalid zone ID, rate limit reached).
