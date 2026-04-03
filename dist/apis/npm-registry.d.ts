export interface PackageCheckResult {
    exists: boolean;
    latestVersion?: string;
    metadata?: any;
    error?: string;
}
export declare function checkPackageExists(name: string): Promise<PackageCheckResult>;
export declare function getPackageMetadata(name: string): Promise<any>;
export declare function getWeeklyDownloads(name: string): Promise<{
    downloads: number;
}>;
export declare function searchPackages(query: string, size?: number): Promise<any>;
//# sourceMappingURL=npm-registry.d.ts.map