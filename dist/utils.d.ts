export declare function fetchWithTimeout(url: string, options?: RequestInit, timeoutMs?: number): Promise<Response>;
export interface ParsedVuln {
    id: string;
    summary: string;
    severity: string;
    score: number | null;
    fixedIn: string | null;
}
export declare function parseSeverity(vuln: any): {
    label: string;
    score: number | null;
};
export declare function parseFixedVersion(vuln: any): string | null;
export declare function sortVersionsDescending(versions: string[]): string[];
export declare function formatVulnList(vulns: ParsedVuln[]): string;
/**
 * Strips version range operators from a version string.
 * Returns null for unresolvable ranges (workspace, file, git, etc.)
 */
export declare function stripVersionRange(version: string): string | null;
//# sourceMappingURL=utils.d.ts.map