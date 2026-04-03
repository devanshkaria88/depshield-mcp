import { fetchWithTimeout } from "../utils.js";
export async function checkPypiPackageExists(name) {
    try {
        const res = await fetchWithTimeout(`https://pypi.org/pypi/${encodeURIComponent(name)}/json`);
        if (!res.ok)
            return { exists: false };
        const data = await res.json();
        return {
            exists: true,
            latestVersion: data.info?.version,
            metadata: data,
        };
    }
    catch {
        return { exists: false };
    }
}
//# sourceMappingURL=pypi-registry.js.map