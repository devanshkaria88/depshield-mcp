import { cache } from "../cache.js";
import { checkPackageExists } from "../apis/npm-registry.js";
import { checkPypiPackageExists } from "../apis/pypi-registry.js";
import { queryVulnerabilities } from "../apis/osv.js";
import { parseSeverity, parseFixedVersion, formatVulnList } from "../utils.js";
export async function checkDependency(params) {
    const ecosystem = params.ecosystem || "npm";
    const osvEcosystem = ecosystem === "pypi" ? "PyPI" : "npm";
    const cacheKey = `check:${ecosystem}:${params.name}:${params.version || "latest"}`;
    const cached = cache.get(cacheKey);
    if (cached)
        return cached;
    let exists;
    let latestVersion;
    let registryError;
    if (ecosystem === "pypi") {
        const result = await checkPypiPackageExists(params.name);
        exists = result.exists;
        latestVersion = result.exists ? result.latestVersion : undefined;
    }
    else {
        const result = await checkPackageExists(params.name);
        exists = result.exists;
        latestVersion = result.exists ? result.latestVersion : undefined;
        registryError = result.error;
    }
    // Distinguish between "package doesn't exist" and "can't reach registry"
    if (!exists && registryError) {
        return `⚠️ CANNOT VERIFY: Could not check '${params.name}' on ${ecosystem}. ${registryError}. Do NOT proceed with installation until this check succeeds.`;
    }
    if (!exists) {
        const msg = `🚫 BLOCKED: Package '${params.name}' does not exist on ${ecosystem}. This may be a hallucinated or typosquatted package name. Do NOT install.`;
        cache.set(cacheKey, msg);
        return msg;
    }
    const version = params.version || latestVersion || "latest";
    let vulns;
    try {
        vulns = await queryVulnerabilities(params.name, version, osvEcosystem);
    }
    catch {
        const msg = `⚠️ WARNING: Could not reach OSV.dev to check vulnerabilities for ${params.name}@${version}. Package exists on ${ecosystem}. Proceed with caution.`;
        cache.set(cacheKey, msg);
        return msg;
    }
    if (!vulns || vulns.length === 0) {
        const msg = `✅ SAFE: ${params.name}@${version} — no known vulnerabilities. Latest version: ${latestVersion || version}. OK to install.`;
        cache.set(cacheKey, msg);
        return msg;
    }
    const parsed = vulns.map((v) => {
        const sev = parseSeverity(v);
        return {
            id: v.id || "UNKNOWN",
            summary: v.summary || "No summary available",
            severity: sev.label,
            score: sev.score,
            fixedIn: parseFixedVersion(v),
        };
    });
    const fixedVersions = parsed.map((p) => p.fixedIn).filter(Boolean);
    const highestFix = fixedVersions.length > 0 ? fixedVersions.sort().pop() : null;
    let msg = `⚠️ VULNERABLE: ${params.name}@${version} has ${vulns.length} known vulnerability(ies)\n\n`;
    msg += formatVulnList(parsed);
    if (highestFix) {
        msg += `\n\n✅ Recommendation: Use ${params.name}@${highestFix} instead.`;
    }
    else {
        msg += `\n\n⚠️ Recommendation: No patched version identified. Consider using an alternative package.`;
    }
    cache.set(cacheKey, msg);
    return msg;
}
//# sourceMappingURL=check-dependency.js.map