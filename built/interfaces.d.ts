/// <reference types="node" />
import { SecureContextOptions } from 'tls';
import https from 'https';
import http from 'http';
import { Unit } from './Unit';
import { Readable, Writable } from 'stream';
export interface PeerConstructorOptions {
    friendly?: boolean;
    name?: string;
}
export interface MessageOptions {
    event: string;
    timeout?: number;
    unit?: Unit;
}
export interface PeerMetaData {
    os: string;
    runtime: string;
    time: number;
    uptime: number;
    protocol: string;
}
export interface ListenOptions {
    server?: https.Server | http.Server;
    port?: number;
    ssl?: SecureContextOptions;
    path?: string;
}
export interface Context extends InitialContext {
    data: any;
    type: string;
    origin: {
        raw: Buffer;
        type: string;
    };
    unit: Unit;
    role: string;
    event: string;
    response?: any;
    error?: any;
    rtt?: number;
    next?(): Promise<void>;
}
export interface ContextForReadable extends StreamContext {
    readable: Readable;
}
export interface ContextForWritable extends StreamContext {
    writable: Writable;
}
export declare type RequestCallbackFunction = (err: Error | null, data: sendableData) => void;
declare type sendableDatum = string | number | Object | Buffer | null | undefined;
export declare type sendableData = sendableDatum | sendableDatum[];
export declare type MessageHandler = (ctx: Context) => void;
export declare type RequestHandler = (ctx: Context, cb: RequestCallbackFunction) => void;
export declare type WritableHandler = (ctx: ContextForWritable, cb: RequestCallbackFunction) => void;
export declare type ReadableHandler = (ctx: ContextForReadable, cb: RequestCallbackFunction) => void;
export {};
//# sourceMappingURL=interfaces.d.ts.map