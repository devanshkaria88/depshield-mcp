import { getVulnDetail } from "../apis/osv.js";
import { parseSeverity } from "../utils.js";
export async function getAdvisoryDetail(params) {
    let vuln;
    try {
        vuln = await getVulnDetail(params.vulnId);
    }
    catch (err) {
        return `❌ Could not fetch advisory ${params.vulnId}: ${err.message}`;
    }
    const sev = parseSeverity(vuln);
    let report = `🔒 SECURITY ADVISORY: ${vuln.id}\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    if (vuln.summary)
        report += `📝 Summary: ${vuln.summary}\n\n`;
    report += `⚡ Severity: ${sev.label}${sev.score !== null ? ` (CVSS: ${sev.score})` : ""}\n`;
    if (vuln.published)
        report += `📅 Published: ${vuln.published}\n`;
    if (vuln.modified)
        report += `📅 Modified: ${vuln.modified}\n`;
    report += `\n`;
    if (vuln.details) {
        report += `📖 Details:\n${vuln.details}\n\n`;
    }
    if (vuln.affected && vuln.affected.length > 0) {
        report += `📦 Affected Packages:\n`;
        for (const aff of vuln.affected) {
            const pkg = aff.package;
            report += `   • ${pkg?.ecosystem || "?"}/${pkg?.name || "?"}\n`;
            if (aff.ranges) {
                for (const range of aff.ranges) {
                    if (range.events) {
                        const introduced = range.events.find((e) => e.introduced)?.introduced;
                        const fixed = range.events.find((e) => e.fixed)?.fixed;
                        if (introduced)
                            report += `     Introduced: ${introduced}\n`;
                        if (fixed)
                            report += `     Fixed: ${fixed}\n`;
                    }
                }
            }
            if (aff.versions && aff.versions.length > 0) {
                const shown = aff.versions.slice(0, 10);
                report += `     Affected versions: ${shown.join(", ")}${aff.versions.length > 10 ? ` (+${aff.versions.length - 10} more)` : ""}\n`;
            }
        }
        report += `\n`;
    }
    if (vuln.references && vuln.references.length > 0) {
        report += `🔗 References:\n`;
        for (const ref of vuln.references) {
            report += `   • ${ref.type || "LINK"}: ${ref.url}\n`;
        }
        report += `\n`;
    }
    if (vuln.aliases && vuln.aliases.length > 0) {
        report += `🏷️  Aliases: ${vuln.aliases.join(", ")}\n`;
    }
    return report;
}
//# sourceMappingURL=get-advisory-detail.js.map