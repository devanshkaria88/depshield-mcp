import { readFile } from "fs/promises";
import { batchQueryVulnerabilities } from "../apis/osv.js";
import { parseSeverity, parseFixedVersion, stripVersionRange, type ParsedVuln } from "../utils.js";

interface DepEntry {
  name: string;
  version: string;
  isDev: boolean;
}

function parsePackageJson(content: string, includeDevDeps: boolean): DepEntry[] {
  const pkg = JSON.parse(content);
  const deps: DepEntry[] = [];

  if (pkg.dependencies) {
    for (const [name, ver] of Object.entries(pkg.dependencies)) {
      const version = stripVersionRange(ver as string);
      if (version) deps.push({ name, version, isDev: false });
    }
  }
  if (includeDevDeps && pkg.devDependencies) {
    for (const [name, ver] of Object.entries(pkg.devDependencies)) {
      const version = stripVersionRange(ver as string);
      if (version) deps.push({ name, version, isDev: true });
    }
  }
  return deps;
}

function parseRequirementsTxt(content: string): DepEntry[] {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !line.startsWith("-"))
    .map((line) => {
      const match = line.match(/^([a-zA-Z0-9_.-]+)==(.+)$/);
      if (match) return { name: match[1], version: match[2], isDev: false };
      const nameOnly = line.match(/^([a-zA-Z0-9_.-]+)/);
      if (nameOnly) return { name: nameOnly[1], version: "latest", isDev: false };
      return null;
    })
    .filter(Boolean) as DepEntry[];
}

export async function auditProject(params: {
  filePath: string;
  includeDevDependencies?: boolean;
}): Promise<string> {
  const includeDevDeps = params.includeDevDependencies ?? true;

  let content: string;
  try {
    content = await readFile(params.filePath, "utf-8");
  } catch (err: any) {
    return `❌ Error reading file: ${params.filePath}\n${err.message}`;
  }

  const isPackageJson = params.filePath.endsWith(".json");
  const deps = isPackageJson
    ? parsePackageJson(content, includeDevDeps)
    : parseRequirementsTxt(content);

  if (deps.length === 0) {
    return `📋 No dependencies found in ${params.filePath}`;
  }

  const ecosystem = isPackageJson ? "npm" : "PyPI";
  const queries = deps.map((d) => ({
    package: { name: d.name, ecosystem },
    version: d.version,
  }));

  let results: any[];
  try {
    results = await batchQueryVulnerabilities(queries);
  } catch {
    return `⚠️ Could not reach OSV.dev for vulnerability scan. Found ${deps.length} dependencies but cannot verify their security status.`;
  }

  const vulnerable: { dep: DepEntry; vulns: ParsedVuln[] }[] = [];
  const clean: DepEntry[] = [];

  for (let i = 0; i < deps.length; i++) {
    const vulns = results[i]?.vulns || [];
    if (vulns.length > 0) {
      const parsed = vulns.map((v: any) => {
        const sev = parseSeverity(v);
        return {
          id: v.id || "UNKNOWN",
          summary: v.summary || "No summary",
          severity: sev.label,
          score: sev.score,
          fixedIn: parseFixedVersion(v),
        };
      });
      vulnerable.push({ dep: deps[i], vulns: parsed });
    } else {
      clean.push(deps[i]);
    }
  }

  const severityCounts: Record<string, number> = {};
  for (const v of vulnerable) {
    for (const vuln of v.vulns) {
      severityCounts[vuln.severity] = (severityCounts[vuln.severity] || 0) + 1;
    }
  }

  let report = `🔍 DEPENDENCY AUDIT REPORT\n`;
  report += `📁 File: ${params.filePath}\n`;
  report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  report += `📊 Summary: ${deps.length} dependencies scanned\n`;
  report += `   ✅ Clean: ${clean.length}\n`;
  report += `   ⚠️  Vulnerable: ${vulnerable.length}\n\n`;

  if (Object.keys(severityCounts).length > 0) {
    report += `📈 Severity Breakdown:\n`;
    for (const [sev, count] of Object.entries(severityCounts)) {
      report += `   ${sev}: ${count}\n`;
    }
    report += `\n`;
  }

  if (vulnerable.length > 0) {
    report += `🚨 VULNERABLE DEPENDENCIES\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    for (const v of vulnerable) {
      report += `\n📦 ${v.dep.name}@${v.dep.version}${v.dep.isDev ? " (dev)" : ""}\n`;
      for (const vuln of v.vulns) {
        report += `   • ${vuln.id} (${vuln.severity}): ${vuln.summary}`;
        if (vuln.fixedIn) report += ` → Fix: ${vuln.fixedIn}`;
        report += `\n`;
      }
    }
    report += `\n`;
  }

  if (clean.length > 0) {
    report += `✅ CLEAN DEPENDENCIES\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    for (const d of clean) {
      report += `   ✓ ${d.name}@${d.version}${d.isDev ? " (dev)" : ""}\n`;
    }
    report += `\n`;
  }

  const hasCritical = severityCounts["CRITICAL"] > 0;
  const hasHigh = severityCounts["HIGH"] > 0;
  if (hasCritical) {
    report += `🔴 VERDICT: CRITICAL RISK — Immediate action required. ${severityCounts["CRITICAL"]} critical vulnerabilities found.`;
  } else if (hasHigh) {
    report += `🟠 VERDICT: HIGH RISK — ${severityCounts["HIGH"]} high severity vulnerabilities found. Upgrade recommended.`;
  } else if (vulnerable.length > 0) {
    report += `🟡 VERDICT: MODERATE RISK — ${vulnerable.length} vulnerable dependencies found. Review and upgrade when possible.`;
  } else {
    report += `🟢 VERDICT: ALL CLEAR — No known vulnerabilities detected.`;
  }

  return report;
}
