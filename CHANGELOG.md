# Changelog

## 0.1.0 (2026-04-03)

Initial release.

### Tools
- `check_dependency` — Pre-install security gate (npm + PyPI)
- `audit_project` — Full package.json / requirements.txt audit via OSV.dev batch API
- `find_safe_version` — Find newest version with zero known CVEs
- `get_advisory_detail` — Deep dive on any CVE/GHSA advisory
- `check_npm_health` — Package health scoring (0–100)
- `suggest_alternative` — Find replacement packages
- `deep_scan` — Transitive dependency tree scanner with suspicious pattern detection

### Resources
- `depshield://status` — Server status and cache stats

### Prompts
- `security_review` — Guided full-project security review template

### Other
- In-memory TTL cache (5 min) to reduce redundant API calls
- Cursor rule file (`.cursor/rules/dep-shield.mdc`)
- Supports npm and PyPI ecosystems
- Zero API keys required — uses free OSV.dev and npm registry APIs
