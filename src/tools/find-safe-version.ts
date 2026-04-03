import { getPackageMetadata } from "../apis/npm-registry.js";
import { checkPypiPackageExists } from "../apis/pypi-registry.js";
import { batchQueryVulnerabilities } from "../apis/osv.js";
import { sortVersionsDescending } from "../utils.js";

export async function findSafeVersion(params: {
  name: string;
  ecosystem?: string;
}): Promise<string> {
  const ecosystem = params.ecosystem || "npm";
  const osvEcosystem = ecosystem === "pypi" ? "PyPI" : "npm";

  let allVersions: string[];

  try {
    if (ecosystem === "pypi") {
      const result = await checkPypiPackageExists(params.name);
      if (!result.exists) return `🚫 Package '${params.name}' not found on PyPI.`;
      const releases = result.metadata?.releases;
      allVersions = releases ? Object.keys(releases) : [];
    } else {
      const metadata = await getPackageMetadata(params.name);
      allVersions = Object.keys(metadata.versions || {});
    }
  } catch (err: any) {
    return `❌ Error fetching package metadata: ${err.message}`;
  }

  const sorted = sortVersionsDescending(allVersions);
  if (sorted.length === 0) {
    return `❌ No stable versions found for ${params.name} on ${ecosystem}.`;
  }

  const candidates = sorted.slice(0, 10);

  const queries = candidates.map((v) => ({
    package: { name: params.name, ecosystem: osvEcosystem },
    version: v,
  }));

  let results: any[];
  try {
    results = await batchQueryVulnerabilities(queries);
  } catch {
    return `⚠️ Could not reach OSV.dev. Latest stable versions: ${candidates.slice(0, 3).join(", ")}`;
  }

  for (let i = 0; i < candidates.length; i++) {
    const vulns = results[i]?.vulns || [];
    if (vulns.length === 0) {
      let msg = `✅ SAFE VERSION FOUND: ${params.name}@${candidates[i]}\n\n`;
      msg += `This is the newest stable version with zero known vulnerabilities.\n`;
      if (i > 0) {
        msg += `\n⚠️ Note: ${i} newer version(s) have known vulnerabilities: ${candidates.slice(0, i).join(", ")}`;
      }
      msg += `\n\nAll versions checked: ${candidates.map((v, j) => `${v} ${(results[j]?.vulns || []).length === 0 ? "✅" : "⚠️"}`).join(", ")}`;
      return msg;
    }
  }

  return `⚠️ NO SAFE VERSION: All ${candidates.length} most recent stable versions of ${params.name} have known vulnerabilities.\n\nVersions checked: ${candidates.join(", ")}\n\nConsider using an alternative package.`;
}
