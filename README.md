<p align="center">
  <img src="https://img.shields.io/badge/🛡️_DepShield-MCP_Server-blue?style=for-the-badge" alt="DepShield MCP" />
</p>

<h3 align="center">Real-time dependency security for AI coding agents</h3>

<p align="center">
  <a href="https://www.npmjs.com/package/depshield-mcp"><img src="https://img.shields.io/npm/v/depshield-mcp?style=flat-square&color=cb3837&label=npm" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/depshield-mcp"><img src="https://img.shields.io/npm/dm/depshield-mcp?style=flat-square&color=blue&label=downloads" alt="npm downloads" /></a>
  <a href="https://github.com/devanshkaria88/depshield-mcp/blob/main/LICENSE"><img src="https://img.shields.io/github/license/devanshkaria88/depshield-mcp?style=flat-square" alt="license" /></a>
  <a href="https://github.com/devanshkaria88/depshield-mcp"><img src="https://img.shields.io/github/stars/devanshkaria88/depshield-mcp?style=flat-square" alt="GitHub stars" /></a>
  <img src="https://img.shields.io/badge/node-%3E%3D22-brightgreen?style=flat-square" alt="node version" />
</p>

<p align="center">
  DepShield intercepts every package your agent tries to install, verifies it exists, checks it against CVE databases, and blocks vulnerable or hallucinated dependencies — <strong>before they touch your codebase</strong>.
</p>

<p align="center">
  Works with <strong>Cursor</strong> · <strong>Claude Code</strong> · <strong>Windsurf</strong> · <strong>Antigravity</strong> · <strong>Cline</strong> · any MCP-compatible IDE
</p>

---

## 🤔 Why

AI coding agents pull packages from stale training data. They install outdated versions with known CVEs. They hallucinate package names that don't exist, opening the door to typosquatting attacks. They default to deprecated libraries when better alternatives exist.

There's no checkpoint between "agent decides to use a package" and "package lands in your project." **DepShield is that checkpoint.**

---

## ⚡ What It Does

Seven security tools exposed over the Model Context Protocol:

| Tool | What it does |
|:-----|:-------------|
| `check_dependency` | Pre-install gate — verifies a package exists on the registry and has no known CVEs. Your agent calls this before every install. |
| `audit_project` | Scans an entire `package.json` or `requirements.txt` and returns a full vulnerability audit report. |
| `find_safe_version` | Finds the newest version of a package with zero known vulnerabilities. |
| `get_advisory_detail` | Deep dive into a specific CVE/GHSA — full description, affected versions, fix info, references. |
| `check_npm_health` | Package health report card: weekly downloads, last publish date, maintainer count, license, deprecation status. Scored 0–100. |
| `suggest_alternative` | Finds better packages when one is vulnerable, deprecated, or abandoned. |
| `deep_scan` | Scans a package's transitive dependency tree for vulnerabilities, typosquats, and suspicious patterns. |

Plus a `depshield://status` resource and a `security_review` prompt template for guided full-project audits.

> **Zero API keys required.** DepShield uses free, open APIs: [npm Registry](https://registry.npmjs.org), [OSV.dev](https://osv.dev) (Google's open vulnerability database), and [PyPI](https://pypi.org).

---

## 🚀 Quick Start

### Option 1: npx (no install)

Add to your IDE's MCP configuration and you're done. No global install needed.

### Option 2: Clone and build

```bash
git clone https://github.com/devanshkaria88/depshield-mcp.git
cd depshield-mcp
npm install
npm run build
```

---

## 🔌 IDE Setup

<details>
<summary><strong>Cursor</strong></summary>

Add to `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (project-level):

```json
{
  "mcpServers": {
    "depshield": {
      "command": "npx",
      "args": ["-y", "depshield-mcp"]
    }
  }
}
```

Or if you cloned the repo locally:

```json
{
  "mcpServers": {
    "depshield": {
      "command": "node",
      "args": ["/absolute/path/to/depshield-mcp/dist/index.js"]
    }
  }
}
```

Optionally, copy `.cursor/rules/dep-shield.mdc` into your project's `.cursor/rules/` directory. This rule forces the Cursor agent to call `check_dependency` before every package install.

</details>

<details>
<summary><strong>Claude Code</strong></summary>

```bash
claude mcp add depshield -- npx depshield-mcp
```

Or from a cloned repo:

```bash
claude mcp add depshield -- node /absolute/path/to/depshield-mcp/dist/index.js
```

</details>

<details>
<summary><strong>Windsurf</strong></summary>

Add to your Windsurf MCP configuration:

```json
{
  "mcpServers": {
    "depshield": {
      "command": "npx",
      "args": ["-y", "depshield-mcp"]
    }
  }
}
```

</details>

<details>
<summary><strong>Any MCP-compatible tool</strong></summary>

DepShield uses stdio transport. Any tool that supports MCP over stdio can use it:

```bash
npx depshield-mcp
```

</details>

---

## 💡 Usage Examples

Once connected, your AI agent has access to all seven tools. Try these prompts:

<table>
<tr>
<td width="50%">

**Pre-install check** *(automatic with .mdc rule)*

> "Add lodash for deep cloning"

Agent calls `check_dependency` → finds CVE → auto-upgrades to safe version

</td>
<td width="50%">

**Block hallucinated packages**

> "Install react-super-utils-pro for state management"

Agent calls `check_dependency` → package doesn't exist → blocks install, suggests alternatives

</td>
</tr>
<tr>
<td>

**Full project audit**

> "Run a security audit on this project's dependencies"

Agent calls `audit_project` on `package.json` → returns full vulnerability report

</td>
<td>

**Package health check**

> "Is this package well maintained?"

Agent calls `check_npm_health` → returns health score (0–100) with breakdown

</td>
</tr>
<tr>
<td>

**Supply chain deep scan**

> "Deep scan express for transitive vulnerabilities"

Agent calls `deep_scan` → scans dependency tree, flags suspicious patterns

</td>
<td>

**Advisory deep dive**

> "Tell me more about GHSA-jf85-cpcp-j695"

Agent calls `get_advisory_detail` → returns full CVE details, remediation info

</td>
</tr>
</table>

---

## 📖 Tools Reference

<details>
<summary><code>check_dependency</code> — Pre-install gate</summary>

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:---------|:--------|:------------|
| `name` | string | yes | — | Package name (e.g., `lodash`, `express`) |
| `version` | string | no | latest | Specific version to check |
| `ecosystem` | `npm` \| `pypi` | no | `npm` | Package ecosystem |

**Returns:** `✅ SAFE`, `⚠️ VULNERABLE` (with fix version), `🚫 BLOCKED` (doesn't exist), or `⚠️ CANNOT VERIFY` (registry unreachable).

</details>

<details>
<summary><code>audit_project</code> — Full manifest audit</summary>

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:---------|:--------|:------------|
| `filePath` | string | yes | — | Path to `package.json` or `requirements.txt` |
| `includeDevDependencies` | boolean | no | `true` | Include devDependencies in scan |

**Returns:** Full audit report with summary stats, per-dependency vulnerability breakdown, severity counts, and risk verdict.

</details>

<details>
<summary><code>find_safe_version</code> — Safe version finder</summary>

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:---------|:--------|:------------|
| `name` | string | yes | — | Package name |
| `ecosystem` | `npm` \| `pypi` | no | `npm` | Package ecosystem |

**Returns:** The newest stable version with zero known vulnerabilities, with comparison of all checked versions.

</details>

<details>
<summary><code>get_advisory_detail</code> — CVE/GHSA deep dive</summary>

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:---------|:--------|:------------|
| `vulnId` | string | yes | — | Vulnerability ID (e.g., `GHSA-jf85-cpcp-j695`, `CVE-2021-23337`) |

**Returns:** Full advisory with summary, severity, CVSS score, affected versions, fix versions, and reference links.

</details>

<details>
<summary><code>check_npm_health</code> — Package health scoring</summary>

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:---------|:--------|:------------|
| `name` | string | yes | — | npm package name |

**Returns:** Health report card (0–100 score) based on: publish recency, weekly downloads, license, repository presence, deprecation status, and maintainer count.

</details>

<details>
<summary><code>suggest_alternative</code> — Alternative package finder</summary>

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:---------|:--------|:------------|
| `name` | string | yes | — | Package to find alternatives for |
| `reason` | string | no | — | Why an alternative is needed |

**Returns:** Top 3 alternative packages with downloads, npm score, and publish date.

</details>

<details>
<summary><code>deep_scan</code> — Transitive dependency scanner</summary>

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:---------|:--------|:------------|
| `name` | string | yes | — | Package to deep scan |
| `version` | string | no | latest | Specific version to scan |
| `depth` | `1` \| `2` | no | `1` | 1 = direct deps, 2 = deps of deps |

**Returns:** Dependency tree with vulnerability flags, suspicious pattern detection (newly added deps, nonexistent packages, low-download typosquat candidates), and risk verdict.

</details>

---

## 🔒 Cursor Rule (Optional)

The `.cursor/rules/dep-shield.mdc` file included in this repo forces the Cursor agent to automatically call `check_dependency` before every package install. Copy it to your project:

```bash
mkdir -p .cursor/rules
cp node_modules/depshield-mcp/.cursor/rules/dep-shield.mdc .cursor/rules/
```

This turns DepShield from a tool the agent _can_ use into a gate the agent _must_ pass through.

---

## 🧪 Testing

**MCP Inspector** (interactive UI for testing tools):

```bash
npm run inspect
```

Or:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

**Raw stdio** (quick verification):

```bash
printf '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}\n{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"check_dependency","arguments":{"name":"lodash","version":"4.17.20"}}}\n' | node dist/index.js 2>/dev/null
```

---

## 🌐 APIs Used

All free, no API keys required:

| API | What it provides |
|:----|:-----------------|
| [npm Registry](https://registry.npmjs.org) | Package existence, versions, metadata, search |
| [npm Downloads API](https://api.npmjs.org) | Weekly download counts |
| [OSV.dev](https://osv.dev) | Open source vulnerability database (Google) |
| [PyPI](https://pypi.org) | Python package metadata |

---

## 📁 Project Structure

```
depshield-mcp/
├── src/
│   ├── index.ts                    # MCP server entry — tool/resource/prompt registration
│   ├── cache.ts                    # In-memory TTL cache (5 min)
│   ├── utils.ts                    # Severity parsing, version sorting, fetch helpers
│   ├── apis/
│   │   ├── npm-registry.ts         # npm registry, search, downloads
│   │   ├── osv.ts                  # OSV.dev vulnerability queries
│   │   └── pypi-registry.ts        # PyPI JSON API
│   └── tools/
│       ├── check-dependency.ts     # Pre-install gate
│       ├── audit-project.ts        # Full manifest audit
│       ├── find-safe-version.ts    # Safe version finder
│       ├── get-advisory-detail.ts  # CVE/GHSA deep dive
│       ├── check-npm-health.ts     # Package health scoring
│       ├── suggest-alternative.ts  # Alternative package finder
│       └── deep-scan.ts            # Transitive dependency scanner
├── .cursor/rules/
│   └── dep-shield.mdc             # Cursor agent rule (alwaysApply)
├── package.json
├── tsconfig.json
├── LICENSE
└── README.md
```

---

## 📋 Requirements

- **Node.js 22** or later
- An MCP-compatible AI coding tool

---

## 🤝 Contributing

Contributions are welcome. Please open an issue first to discuss what you'd like to change.

Areas where help would be appreciated:
- Additional ecosystem support (Cargo, Go modules, Maven)
- Improved CVSS vector string parsing
- Integration tests with mocked API responses
- GitHub Actions CI pipeline

---

## 📄 License

MIT — see [LICENSE](LICENSE) for details.

---

<p align="center">
  Built by <a href="https://github.com/devanshkaria88">Devansh Karia</a>
</p>

<p align="center">
  <a href="https://buymeacoffee.com/devanshkaria88">
    <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="50" width="217" />
  </a>
</p>
