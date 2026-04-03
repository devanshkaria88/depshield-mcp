export declare function checkPypiPackageExists(name: string): Promise<{
    exists: false;
    latestVersion?: undefined;
    metadata?: undefined;
} | {
    exists: true;
    latestVersion: string;
    metadata: any;
}>;
//# sourceMappingURL=pypi-registry.d.ts.map