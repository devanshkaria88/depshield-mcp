import { fetchWithTimeout } from "../utils.js";
const OSV_API = "https://api.osv.dev/v1";
export async function queryVulnerabilities(name, version, ecosystem) {
    const res = await fetchWithTimeout(`${OSV_API}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            package: { name, ecosystem },
            version,
        }),
    });
    if (!res.ok)
        return [];
    const data = await res.json();
    return data.vulns || [];
}
export async function batchQueryVulnerabilities(queries) {
    const res = await fetchWithTimeout(`${OSV_API}/querybatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queries }),
    });
    if (!res.ok)
        return queries.map(() => ({ vulns: [] }));
    const data = await res.json();
    return data.results || [];
}
export async function getVulnDetail(vulnId) {
    const res = await fetchWithTimeout(`${OSV_API}/vulns/${encodeURIComponent(vulnId)}`);
    if (!res.ok)
        throw new Error(`OSV.dev returned ${res.status} for ${vulnId}`);
    return res.json();
}
//# sourceMappingURL=osv.js.map