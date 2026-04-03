import { fetchWithTimeout } from "../utils.js";

export async function checkPypiPackageExists(name: string) {
  try {
    const res = await fetchWithTimeout(`https://pypi.org/pypi/${encodeURIComponent(name)}/json`);
    if (!res.ok) return { exists: false as const };
    const data = await res.json();
    return {
      exists: true as const,
      latestVersion: data.info?.version as string,
      metadata: data,
    };
  } catch {
    return { exists: false as const };
  }
}
