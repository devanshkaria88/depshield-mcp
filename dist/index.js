#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { checkDependency } from "./tools/check-dependency.js";
import { auditProject } from "./tools/audit-project.js";
import { findSafeVersion } from "./tools/find-safe-version.js";
import { getAdvisoryDetail } from "./tools/get-advisory-detail.js";
import { checkNpmHealth } from "./tools/check-npm-health.js";
import { suggestAlternative } from "./tools/suggest-alternative.js";
import { deepScan } from "./tools/deep-scan.js";
import { cache } from "./cache.js";
const startTime = Date.now();
const server = new McpServer({
    name: "depshield",
    version: "0.1.0",
});
// ── Tools ──
server.tool("check_dependency", "Check a package for known vulnerabilities and verify it exists on the registry. MUST be called before installing any dependency.", {
    name: z.string().describe("Package name (e.g., 'lodash', 'express')"),
    version: z.string().optional().describe("Specific version to check. If omitted, checks latest."),
    ecosystem: z.enum(["npm", "pypi"]).optional().describe("Package ecosystem. Defaults to npm."),
}, async (params) => {
    try {
        const text = await checkDependency(params);
        return { content: [{ type: "text", text }] };
    }
    catch (err) {
        return { content: [{ type: "text", text: `❌ Error checking dependency: ${err.message}` }] };
    }
});
server.tool("audit_project", "Scan a package.json or requirements.txt for all dependency vulnerabilities. Returns a full audit report.", {
    filePath: z.string().describe("Path to package.json or requirements.txt"),
    includeDevDependencies: z.boolean().optional().describe("Include devDependencies in scan. Defaults to true."),
}, async (params) => {
    try {
        const text = await auditProject(params);
        return { content: [{ type: "text", text }] };
    }
    catch (err) {
        return { content: [{ type: "text", text: `❌ Error auditing project: ${err.message}` }] };
    }
});
server.tool("find_safe_version", "Find the newest version of a package with zero known vulnerabilities.", {
    name: z.string().describe("Package name"),
    ecosystem: z.enum(["npm", "pypi"]).optional().describe("Package ecosystem. Defaults to npm."),
}, async (params) => {
    try {
        const text = await findSafeVersion(params);
        return { content: [{ type: "text", text }] };
    }
    catch (err) {
        return { content: [{ type: "text", text: `❌ Error finding safe version: ${err.message}` }] };
    }
});
server.tool("get_advisory_detail", "Get full details about a specific security advisory (CVE, GHSA, etc).", {
    vulnId: z.string().describe("Vulnerability ID (e.g., 'GHSA-jf85-cpcp-j695' or 'CVE-2021-23337')"),
}, async (params) => {
    try {
        const text = await getAdvisoryDetail(params);
        return { content: [{ type: "text", text }] };
    }
    catch (err) {
        return { content: [{ type: "text", text: `❌ Error fetching advisory: ${err.message}` }] };
    }
});
server.tool("check_npm_health", "Assess package health and trustworthiness: downloads, maintenance, license, deprecation status. Scored 0-100.", {
    name: z.string().describe("npm package name"),
}, async (params) => {
    try {
        const text = await checkNpmHealth(params);
        return { content: [{ type: "text", text }] };
    }
    catch (err) {
        return { content: [{ type: "text", text: `❌ Error checking package health: ${err.message}` }] };
    }
});
server.tool("suggest_alternative", "Find alternative packages when one is vulnerable, deprecated, or unmaintained.", {
    name: z.string().describe("Package name to find alternatives for"),
    reason: z.string().optional().describe("Why an alternative is needed (e.g., 'deprecated', 'vulnerable', 'unmaintained')"),
}, async (params) => {
    try {
        const text = await suggestAlternative(params);
        return { content: [{ type: "text", text }] };
    }
    catch (err) {
        return { content: [{ type: "text", text: `❌ Error suggesting alternatives: ${err.message}` }] };
    }
});
server.tool("deep_scan", "Scan a package's transitive dependency tree for vulnerabilities and suspicious patterns (newly added deps, typosquats, low-download packages).", {
    name: z.string().describe("Package name to deep scan"),
    version: z.string().optional().describe("Specific version to scan. If omitted, scans latest."),
    depth: z.number().min(1).max(2).optional().describe("How deep to scan: 1 = direct deps only (default), 2 = deps of deps."),
}, async (params) => {
    try {
        const text = await deepScan(params);
        return { content: [{ type: "text", text }] };
    }
    catch (err) {
        return { content: [{ type: "text", text: `❌ Error during deep scan: ${err.message}` }] };
    }
});
// ── Resource ──
server.resource("status", "depshield://status", { description: "DepShield server status and cache statistics" }, async () => {
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    const cacheStats = cache.stats();
    let reachable = { npm: false, osv: false };
    try {
        const npmRes = await fetch("https://registry.npmjs.org/", { signal: AbortSignal.timeout(3000) });
        reachable.npm = npmRes.ok;
    }
    catch { }
    try {
        const osvRes = await fetch("https://api.osv.dev/v1/vulns/GHSA-0000-0000-0000", { signal: AbortSignal.timeout(3000) });
        reachable.osv = osvRes.status !== 0;
    }
    catch { }
    const text = [
        `DepShield MCP Server v0.1.0`,
        `Uptime: ${uptime}s`,
        `Cache: ${cacheStats.size} entries, ${cacheStats.hits} hits, ${cacheStats.misses} misses`,
        `npm Registry: ${reachable.npm ? "✅ reachable" : "❌ unreachable"}`,
        `OSV.dev: ${reachable.osv ? "✅ reachable" : "❌ unreachable"}`,
    ].join("\n");
    return { contents: [{ uri: "depshield://status", text }] };
});
// ── Prompt ──
server.prompt("security_review", "Guided full-project security review using all DepShield tools", { projectPath: z.string().optional().describe("Path to project root. Defaults to workspace root.") }, (params) => {
    const path = params.projectPath || ".";
    return {
        messages: [
            {
                role: "user",
                content: {
                    type: "text",
                    text: `Perform a comprehensive dependency security review of the project at "${path}". Follow these steps:

1. Find all package.json and requirements.txt files in the project
2. Run audit_project on each dependency manifest file found
3. For any HIGH or CRITICAL vulnerabilities found, run get_advisory_detail on each one
4. For each vulnerable package, run find_safe_version to identify the safest upgrade target
5. For any deprecated or unmaintained packages found, run suggest_alternative
6. Compile everything into a prioritized action plan with:
   - Critical fixes (do immediately)
   - High priority upgrades
   - Recommended improvements
   - Summary of overall project security posture

Be thorough but concise. Focus on actionable recommendations.`,
                },
            },
        ],
    };
});
// ── Start ──
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("DepShield MCP server running on stdio");
//# sourceMappingURL=index.js.map