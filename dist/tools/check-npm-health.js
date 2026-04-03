import { getPackageMetadata, getWeeklyDownloads } from "../apis/npm-registry.js";
export async function checkNpmHealth(params) {
    let metadata;
    try {
        metadata = await getPackageMetadata(params.name);
    }
    catch (err) {
        return `❌ Could not fetch package metadata for '${params.name}': ${err.message}`;
    }
    const latestVersion = metadata["dist-tags"]?.latest || "unknown";
    const timeData = metadata.time || {};
    const latestPublishDate = timeData[latestVersion] || null;
    const allVersions = Object.keys(metadata.versions || {});
    const maintainers = metadata.maintainers || [];
    const license = metadata.license || (metadata.versions?.[latestVersion]?.license) || null;
    const latestMeta = metadata.versions?.[latestVersion] || {};
    const deprecated = latestMeta.deprecated || null;
    const repository = metadata.repository?.url || latestMeta.repository?.url || null;
    const description = metadata.description || "";
    const { downloads } = await getWeeklyDownloads(params.name);
    let score = 0;
    const breakdown = [];
    if (latestPublishDate) {
        const ageMs = Date.now() - new Date(latestPublishDate).getTime();
        const ageMonths = ageMs / (1000 * 60 * 60 * 24 * 30);
        if (ageMonths < 6) {
            score += 25;
            breakdown.push(`Last publish < 6mo ago: +25`);
        }
        else if (ageMonths < 12) {
            score += 15;
            breakdown.push(`Last publish < 1yr ago: +15`);
        }
        else if (ageMonths < 24) {
            score += 5;
            breakdown.push(`Last publish < 2yr ago: +5`);
        }
        else {
            breakdown.push(`Last publish > 2yr ago: +0`);
        }
    }
    else {
        breakdown.push(`No publish date data: +0`);
    }
    if (downloads > 1_000_000) {
        score += 25;
        breakdown.push(`Downloads > 1M/wk: +25`);
    }
    else if (downloads > 100_000) {
        score += 20;
        breakdown.push(`Downloads > 100K/wk: +20`);
    }
    else if (downloads > 10_000) {
        score += 15;
        breakdown.push(`Downloads > 10K/wk: +15`);
    }
    else if (downloads > 1_000) {
        score += 10;
        breakdown.push(`Downloads > 1K/wk: +10`);
    }
    else if (downloads > 100) {
        score += 5;
        breakdown.push(`Downloads > 100/wk: +5`);
    }
    else {
        breakdown.push(`Downloads < 100/wk: +0`);
    }
    if (license) {
        score += 10;
        breakdown.push(`Has license (${license}): +10`);
    }
    else {
        breakdown.push(`No license: +0`);
    }
    if (repository) {
        score += 10;
        breakdown.push(`Has repository: +10`);
    }
    else {
        breakdown.push(`No repository: +0`);
    }
    if (!deprecated) {
        score += 15;
        breakdown.push(`Not deprecated: +15`);
    }
    else {
        breakdown.push(`⚠️ DEPRECATED: +0`);
    }
    if (maintainers.length >= 2) {
        score += 15;
        breakdown.push(`${maintainers.length} maintainers: +15`);
    }
    else if (maintainers.length === 1) {
        score += 10;
        breakdown.push(`1 maintainer: +10`);
    }
    else {
        breakdown.push(`0 maintainers: +0`);
    }
    const verdict = score >= 70 ? "🟢 HEALTHY" : score >= 40 ? "🟡 CAUTION" : "🔴 UNHEALTHY";
    let report = `📋 PACKAGE HEALTH REPORT: ${params.name}\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    report += `📦 Latest Version: ${latestVersion}\n`;
    report += `📅 Last Published: ${latestPublishDate ? new Date(latestPublishDate).toLocaleDateString() : "Unknown"}\n`;
    report += `📊 Total Versions: ${allVersions.length}\n`;
    report += `📥 Weekly Downloads: ${downloads.toLocaleString()}\n`;
    report += `👥 Maintainers: ${maintainers.map((m) => m.name || m.email).join(", ") || "None"}\n`;
    report += `📄 License: ${license || "None"}\n`;
    report += `🔗 Repository: ${repository || "None"}\n`;
    report += `📝 Description: ${description || "None"}\n`;
    if (deprecated)
        report += `⚠️  Deprecated: ${deprecated}\n`;
    report += `\n`;
    report += `📊 Health Score: ${score}/100\n`;
    report += `${verdict}\n\n`;
    report += `Score Breakdown:\n`;
    for (const b of breakdown) {
        report += `   ${b}\n`;
    }
    return report;
}
//# sourceMappingURL=check-npm-health.js.map