export declare function queryVulnerabilities(name: string, version: string, ecosystem: string): Promise<any[]>;
export declare function batchQueryVulnerabilities(queries: {
    package: {
        name: string;
        ecosystem: string;
    };
    version: string;
}[]): Promise<any[]>;
export declare function getVulnDetail(vulnId: string): Promise<any>;
//# sourceMappingURL=osv.d.ts.map