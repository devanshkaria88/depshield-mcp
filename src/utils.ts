export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 8000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw new Error(`Request to ${url} timed out after ${timeoutMs}ms`);
    }
    throw new Error(`Network error fetching ${url}: ${err.message}`);
  } finally {
    clearTimeout(timer);
  }
}

export interface ParsedVuln {
  id: string;
  summary: string;
  severity: string;
  score: number | null;
  fixedIn: string | null;
}

export function parseSeverity(vuln: any): { label: string; score: number | null } {
  // Try CVSS v3 score from severity array
  if (vuln.severity && Array.isArray(vuln.severity)) {
    const cvss = vuln.severity.find((s: any) => s.type === "CVSS_V3");
    if (cvss) {
      let score: number | null = null;
      if (typeof cvss.score === "number") {
        score = cvss.score;
      } else if (typeof cvss.score === "string") {
        score = parseFloat(cvss.score);
      }
      if (score !== null && !isNaN(score)) {
        return { label: scoreToLabel(score), score };
      }
    }
  }

  // Fallback: database_specific.severity
  const dbSeverity = vuln.database_specific?.severity;
  if (typeof dbSeverity === "string") {
    return { label: dbSeverity.toUpperCase(), score: null };
  }

  return { label: "UNKNOWN", score: null };
}

function scoreToLabel(score: number): string {
  if (score >= 9.0) return "CRITICAL";
  if (score >= 7.0) return "HIGH";
  if (score >= 4.0) return "MEDIUM";
  return "LOW";
}

export function parseFixedVersion(vuln: any): string | null {
  if (!vuln.affected || !Array.isArray(vuln.affected)) return null;
  for (const affected of vuln.affected) {
    if (!affected.ranges || !Array.isArray(affected.ranges)) continue;
    for (const range of affected.ranges) {
      if (!range.events || !Array.isArray(range.events)) continue;
      for (const event of range.events) {
        if (event.fixed) return event.fixed;
      }
    }
  }
  return null;
}

export function sortVersionsDescending(versions: string[]): string[] {
  return versions
    .filter((v) => !v.includes("-"))
    .sort((a, b) => {
      const pa = a.split(".").map(Number);
      const pb = b.split(".").map(Number);
      for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const diff = (pb[i] || 0) - (pa[i] || 0);
        if (diff !== 0) return diff;
      }
      return 0;
    });
}

export function formatVulnList(vulns: ParsedVuln[]): string {
  return vulns
    .map(
      (v) =>
        `• ${v.id} (${v.severity}): ${v.summary}${v.fixedIn ? ` — Fixed in ${v.fixedIn}` : ""}`
    )
    .join("\n");
}

/**
 * Strips version range operators from a version string.
 * Returns null for unresolvable ranges (workspace, file, git, etc.)
 */
export function stripVersionRange(version: string): string | null {
  if (!version || version === "*" || version === "latest") return null;

  // Skip non-registry version specifiers
  if (
    version.startsWith("workspace:") ||
    version.startsWith("file:") ||
    version.startsWith("git+") ||
    version.startsWith("git:") ||
    version.startsWith("http") ||
    version.startsWith("npm:")
  ) {
    return null;
  }

  const stripped = version.replace(/^[\^~>=<\s]+/, "").trim();

  // Validate it looks like a version number
  if (/^\d/.test(stripped)) return stripped;

  return null;
}
