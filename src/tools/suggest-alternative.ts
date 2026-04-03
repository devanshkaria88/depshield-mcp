import { getPackageMetadata, searchPackages, getWeeklyDownloads } from "../apis/npm-registry.js";

export async function suggestAlternative(params: {
  name: string;
  reason?: string;
}): Promise<string> {
  let description = "";
  let keywords: string[] = [];

  try {
    const metadata = await getPackageMetadata(params.name);
    description = metadata.description || "";
    keywords = metadata.keywords || [];
  } catch {
    // package might not exist, use the name as search term
  }

  const searchTerms = keywords.length > 0
    ? keywords.slice(0, 3).join(" ")
    : description
      ? description.split(" ").slice(0, 5).join(" ")
      : params.name;

  let results: any[];
  try {
    results = await searchPackages(searchTerms, 10);
  } catch {
    return `❌ Could not search npm for alternatives to ${params.name}.`;
  }

  const filtered = results.filter((r: any) => r.name !== params.name);
  const top = filtered.slice(0, 3);

  if (top.length === 0) {
    return `🔍 No alternative packages found for '${params.name}'. Try searching manually on npmjs.com.`;
  }

  let report = `🔄 ALTERNATIVES TO ${params.name}\n`;
  if (params.reason) report += `📌 Reason: ${params.reason}\n`;
  report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  for (let i = 0; i < top.length; i++) {
    const pkg = top[i];
    let downloads = 0;
    try {
      const dl = await getWeeklyDownloads(pkg.name);
      downloads = dl.downloads;
    } catch {}

    report += `${i + 1}. 📦 ${pkg.name} (v${pkg.version})\n`;
    report += `   ${pkg.description || "No description"}\n`;
    report += `   📥 ${downloads.toLocaleString()} downloads/week\n`;
    report += `   ⭐ npm score: ${(pkg.score * 100).toFixed(0)}%\n`;
    if (pkg.date) report += `   📅 Last published: ${new Date(pkg.date).toLocaleDateString()}\n`;
    report += `\n`;
  }

  report += `💡 Run check_dependency on any of these before installing.`;
  return report;
}
