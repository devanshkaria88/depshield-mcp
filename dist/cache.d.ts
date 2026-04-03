declare class Cache<T = string> {
    private store;
    private _hits;
    private _misses;
    get(key: string): T | null;
    set(key: string, value: T): void;
    stats(): {
        size: number;
        hits: number;
        misses: number;
    };
    clear(): void;
}
export declare const cache: Cache<string>;
export {};
//# sourceMappingURL=cache.d.ts.map