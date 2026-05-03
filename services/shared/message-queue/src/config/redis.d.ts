import { RedisClientType } from 'redis';
declare class RedisManager {
    private client;
    private isConnected;
    constructor();
    connect(): Promise<void>;
    getClient(): RedisClientType;
}
export declare const redisManager: RedisManager;
export {};
