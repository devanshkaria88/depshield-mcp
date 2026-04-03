import { cache } from "../cache.js";
import { getPackageMetadata, getWeeklyDownloads, checkPackageExists } from "../apis/npm-registry.js";
import { batchQueryVulnerabilities } from "../apis/osv.js";
import { parseSeverity, parseFixedVersion, stripVersionRange, sortVersionsDescending } from "../utils.js";
async function resolveDepVersion(name) {
    const result = await checkPackageExists(name);
    if (!result.exists)
        return { version: "unknown", exists: false };
    return { version: result.latestVersion, exists: true };
}
function getDepsForVersion(metadata, version) {
    return metadata.versions?.[version]?.dependencies || {};
}
function getPreviousVersion(metadata, currentVersion) {
    const allVersions = Object.keys(metadata.versions || {});
    const sorted = sortVersionsDescending(allVersions);
    const idx = sorted.indexOf(currentVersion);
    if (idx >= 0 && idx < sorted.length - 1)
        return sorted[idx + 1];
    return null;
}
export async function deepScan(params) {
    const maxDepth = Math.min(params.depth || 1, 2);
    const cacheKey = `deepscan:${params.name}:${params.version || "latest"}:${maxDepth}`;
    const cached = cache.get(cacheKey);
    if (cached)
        return cached;
    let metadata;
    try {
        metadata = await getPackageMetadata(params.name);
    }
    catch (err) {
        return `❌ Could not fetch metadata for '${params.name}': ${err.message}`;
    }
    const version = params.version || metadata["dist-tags"]?.latest;
    if (!version)
        return `❌ Could not resolve version for '${params.name}'.`;
    if (!metadata.versions?.[version]) {
        return `❌ Version ${version} not found for '${params.name}'.`;
    }
    const directDeps = getDepsForVersion(metadata, version);
    const directDepNames = Object.keys(directDeps);
    if (directDepNames.length === 0) {
        const msg = `✅ ${params.name}@${version} has zero dependencies. No transitive risk.`;
        cache.set(cacheKey, msg);
        return msg;
    }
    const weirdPatterns = [];
    const prevVersion = getPreviousVersion(metadata, version);
    if (prevVersion) {
        const prevDeps = getDepsForVersion(metadata, prevVersion);
        for (const dep of directDepNames) {
            if (!(dep in prevDeps)) {
                weirdPatterns.push({
                    type: "NEW_DEP",
                    dep,
                    detail: `Newly added in ${version} (not in ${prevVersion})`,
                });
            }
        }
    }
    const resolvedDirect = [];
    const resolveResults = await Promise.all(directDepNames.map(async (depName) => {
        const { version: depVer, exists } = await resolveDepVersion(depName);
        if (!exists) {
            weirdPatterns.push({
                type: "NONEXISTENT",
                dep: depName,
                detail: `Dependency '${depName}' does not exist on npm — possible typosquat or compromised manifest`,
            });
        }
        return { name: depName, version: depVer, parent: `${params.name}@${version}`, depth: 1, exists };
    }));
    for (const r of resolveResults) {
        if (r.exists) {
            resolvedDirect.push({ name: r.name, version: r.version, parent: r.parent, depth: r.depth });
        }
    }
    let resolvedTransitive = [];
    if (maxDepth >= 2) {
        const subDepFetches = resolvedDirect.map(async (dep) => {
            try {
                const depMeta = await getPackageMetadata(dep.name);
                const subDeps = getDepsForVersion(depMeta, dep.version);
                const subResults = [];
                for (const [subName, subRange] of Object.entries(subDeps)) {
                    const stripped = stripVersionRange(subRange);
                    if (stripped) {
                        subResults.push({
                            name: subName,
                            version: stripped,
                            parent: `${dep.name}@${dep.version}`,
                            depth: 2,
                        });
                    }
                }
                return subResults;
            }
            catch {
                return [];
            }
        });
        const allSubs = await Promise.all(subDepFetches);
        resolvedTransitive = allSubs.flat();
    }
    const allDeps = [...resolvedDirect, ...resolvedTransitive];
    const seen = new Set();
    const uniqueDeps = [];
    for (const dep of allDeps) {
        const key = `${dep.name}@${dep.version}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueDeps.push(dep);
        }
    }
    const queries = uniqueDeps.map((d) => ({
        package: { name: d.name, ecosystem: "npm" },
        version: d.version,
    }));
    let osvResults;
    try {
        osvResults = await batchQueryVulnerabilities(queries);
    }
    catch {
        return `⚠️ Could not reach OSV.dev. Found ${uniqueDeps.length} transitive dependencies but cannot verify their security.`;
    }
    const downloadChecks = await Promise.all(resolvedDirect.map(async (dep) => {
        const { downloads } = await getWeeklyDownloads(dep.name);
        if (downloads < 100) {
            weirdPatterns.push({
                type: "LOW_DOWNLOADS",
                dep: dep.name,
                detail: `Only ${downloads} downloads/week — unusually low, possible typosquat`,
            });
        }
        return { name: dep.name, downloads };
    }));
    const downloadMap = new Map(downloadChecks.map((d) => [d.name, d.downloads]));
    const results = uniqueDeps.map((dep, i) => {
        const vulns = (osvResults[i]?.vulns || []).map((v) => {
            const sev = parseSeverity(v);
            return {
                id: v.id || "UNKNOWN",
                summary: v.summary || "No summary",
                severity: sev.label,
                score: sev.score,
                fixedIn: parseFixedVersion(v),
            };
        });
        return {
            ...dep,
            vulns,
            downloads: downloadMap.get(dep.name) || -1,
        };
    });
    const vulnerableDeps = results.filter((r) => r.vulns.length > 0);
    const totalVulns = vulnerableDeps.reduce((sum, r) => sum + r.vulns.length, 0);
    let report = `🔬 DEEP SCAN: ${params.name}@${version}\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    report += `📊 Scanned ${uniqueDeps.length} transitive dependencies (depth: ${maxDepth})\n`;
    report += `   Direct deps: ${resolvedDirect.length}\n`;
    if (maxDepth >= 2)
        report += `   Sub-deps: ${resolvedTransitive.length} (${uniqueDeps.length - resolvedDirect.length} unique)\n`;
    report += `   Vulnerable: ${vulnerableDeps.length} package(s) with ${totalVulns} total vulnerability(ies)\n\n`;
    if (weirdPatterns.length > 0) {
        report += `🚩 SUSPICIOUS PATTERNS DETECTED\n`;
        report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        for (const p of weirdPatterns) {
            const icon = p.type === "NONEXISTENT" ? "🚫" : p.type === "LOW_DOWNLOADS" ? "👻" : "🆕";
            report += `${icon} ${p.dep}: ${p.detail}\n`;
        }
        report += `\n`;
    }
    report += `📦 DEPENDENCY TREE\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    report += `${params.name}@${version}\n`;
    for (const dep of resolvedDirect) {
        const result = results.find((r) => r.name === dep.name && r.depth === 1);
        const vulnCount = result?.vulns.length || 0;
        const flag = vulnCount > 0 ? ` ⚠️ ${vulnCount} vuln(s)` : " ✅";
        const dlNote = downloadMap.has(dep.name) ? ` [${downloadMap.get(dep.name).toLocaleString()}/wk]` : "";
        report += `├── ${dep.name}@${dep.version}${flag}${dlNote}\n`;
        if (maxDepth >= 2) {
            const subDeps = results.filter((r) => r.depth === 2 && r.parent === `${dep.name}@${dep.version}`);
            for (let j = 0; j < subDeps.length; j++) {
                const sub = subDeps[j];
                const subFlag = sub.vulns.length > 0 ? ` ⚠️ ${sub.vulns.length} vuln(s)` : " ✅";
                const connector = j === subDeps.length - 1 ? "└──" : "├──";
                report += `│   ${connector} ${sub.name}@${sub.version}${subFlag}\n`;
            }
        }
    }
    report += `\n`;
    if (vulnerableDeps.length > 0) {
        report += `🚨 VULNERABLE TRANSITIVE DEPENDENCIES\n`;
        report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        for (const dep of vulnerableDeps) {
            report += `\n📦 ${dep.name}@${dep.version} (via ${dep.parent})\n`;
            for (const vuln of dep.vulns) {
                report += `   • ${vuln.id} (${vuln.severity}): ${vuln.summary}`;
                if (vuln.fixedIn)
                    report += ` → Fix: ${vuln.fixedIn}`;
                report += `\n`;
            }
        }
        report += `\n`;
    }
    const hasCritical = vulnerableDeps.some((d) => d.vulns.some((v) => v.severity === "CRITICAL"));
    const hasHigh = vulnerableDeps.some((d) => d.vulns.some((v) => v.severity === "HIGH"));
    const hasWeird = weirdPatterns.some((p) => p.type === "NONEXISTENT" || p.type === "LOW_DOWNLOADS");
    if (hasCritical || (hasWeird && weirdPatterns.some((p) => p.type === "NONEXISTENT"))) {
        report += `🔴 VERDICT: CRITICAL — Transitive supply chain risk detected. Review immediately.`;
    }
    else if (hasHigh || hasWeird) {
        report += `🟠 VERDICT: HIGH RISK — Vulnerable or suspicious transitive dependencies found.`;
    }
    else if (vulnerableDeps.length > 0) {
        report += `🟡 VERDICT: MODERATE — Some transitive vulnerabilities found. Review recommended.`;
    }
    else if (weirdPatterns.length > 0) {
        report += `🟡 VERDICT: CAUTION — No vulnerabilities, but unusual dependency patterns detected.`;
    }
    else {
        report += `🟢 VERDICT: CLEAN — No transitive vulnerabilities or suspicious patterns found.`;
    }
    cache.set(cacheKey, report);
    return report;
}
//# sourceMappingURL=deep-scan.js.map