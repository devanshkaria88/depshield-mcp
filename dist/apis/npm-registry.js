import { fetchWithTimeout } from "../utils.js";
const NPM_REGISTRY = "https://registry.npmjs.org";
const NPM_DOWNLOADS = "https://api.npmjs.org/downloads/point/last-week";
export async function checkPackageExists(name) {
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
            latestVersion: data["dist-tags"]?.latest,
            metadata: data,
        };
    }
    catch (err) {
        return { exists: false, error: `Could not reach npm registry: ${err.message}` };
    }
}
export async function getPackageMetadata(name) {
    const res = await fetchWithTimeout(`${NPM_REGISTRY}/${encodeURIComponent(name)}`);
    if (!res.ok)
        throw new Error(`npm registry returned ${res.status} for ${name}`);
    return res.json();
}
export async function getWeeklyDownloads(name) {
    try {
        const res = await fetchWithTimeout(`${NPM_DOWNLOADS}/${encodeURIComponent(name)}`);
        if (!res.ok)
            return { downloads: 0 };
        const data = await res.json();
        return { downloads: data.downloads ?? 0 };
    }
    catch {
        return { downloads: 0 };
    }
}
export async function searchPackages(query, size = 5) {
    const res = await fetchWithTimeout(`${NPM_REGISTRY}/-/v1/search?text=${encodeURIComponent(query)}&size=${size}`);
    if (!res.ok)
        return [];
    const data = await res.json();
    return (data.objects || []).map((obj) => ({
        name: obj.package.name,
        description: obj.package.description,
        version: obj.package.version,
        date: obj.package.date,
        score: obj.score?.final ?? 0,
    }));
}
//# sourceMappingURL=npm-registry.js.map