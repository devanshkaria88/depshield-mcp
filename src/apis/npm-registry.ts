import { fetchWithTimeout } from "../utils.js";

const NPM_REGISTRY = "https://registry.npmjs.org";
const NPM_DOWNLOADS = "https://api.npmjs.org/downloads/point/last-week";

export interface PackageCheckResult {
  exists: boolean;
  latestVersion?: string;
  metadata?: any;
  error?: string; // Set when we can't determine existence (network error, not 404)
}

export async function checkPackageExists(name: string): Promise<PackageCheckResult> {
  try {
    const res = await fetchWithTimeout(`${NPM_REGISTRY}/${encodeURIComponent(name)}`, {
      headers: { Accept: "application/vnd.npm.install-v1+json" },
    });
    if (res.status === 404) {
      return { exists: false };
    }
    if (!res.ok) {
      return { exists: false, error: `npm registry returned HTTP ${res.status} for '${name}'` };
    }
    const data = await res.json();
    return {
      exists: true,
      latestVersion: data["dist-tags"]?.latest as string,
      metadata: data,
    };
  } catch (err: any) {
    return { exists: false, error: `Could not reach npm registry: ${err.message}` };
  }
}

export async function getPackageMetadata(name: string): Promise<any> {
  const res = await fetchWithTimeout(`${NPM_REGISTRY}/${encodeURIComponent(name)}`);
  if (!res.ok) throw new Error(`npm registry returned ${res.status} for ${name}`);
  return res.json();
}

export async function getWeeklyDownloads(name: string): Promise<{ downloads: number }> {
  try {
    const res = await fetchWithTimeout(`${NPM_DOWNLOADS}/${encodeURIComponent(name)}`);
    if (!res.ok) return { downloads: 0 };
    const data = await res.json();
    return { downloads: data.downloads ?? 0 };
  } catch {
    return { downloads: 0 };
  }
}

export async function searchPackages(query: string, size = 5) {
  const res = await fetchWithTimeout(
    `${NPM_REGISTRY}/-/v1/search?text=${encodeURIComponent(query)}&size=${size}`
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.objects || []).map((obj: any) => ({
    name: obj.package.name,
    description: obj.package.description,
    version: obj.package.version,
    date: obj.package.date,
    score: obj.score?.final ?? 0,
  }));
}
