/// <reference types="node" />
import { SecureContextOptions } from 'tls';
import { Server } from 'https';
import { Server as httpServer } from 'http';
import { Unit } from './Unit';
import { Readable, Writable } from 'stream';
export interface PeerOptions {
    friendly?: boolean;
    name?: string;
}
export interface EmitOptions {
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
    server?: Server | httpServer;
    port?: number;
    ssl?: SecureContextOptions;
    path?: string;
}
export interface ConnectOptions {
    permanent?: boolean;
}
export interface Context {
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
export interface ContextForReadable extends Context {
    readable: Readable;
}
export interface ContextForWritable extends Context {
    writable: Writable;
}
export declare type RequestCallback = (err: Error | null, data: sendableData) => void;
declare type sendableDatum = string | number | Object | Buffer | null | undefined;
export declare type sendableData = sendableDatum | sendableDatum[];
export declare type MessageHandler = (ctx: Context) => void;
export declare type RequestHandler = (ctx: Context, cb: RequestCallback) => void;
export declare type WritableHandler = (ctx: ContextForWritable, cb: RequestCallback) => void;
export declare type ReadableHandler = (ctx: ContextForReadable, cb: RequestCallback) => void;
export {};
//# sourceMappingURL=interfaces.d.ts.map