import { EventEmitter } from 'events';
import { Peer } from '.';
import { SecureContextOptions } from 'tls';
import https from 'https';
import http from 'http';
import { Unit } from './Unit';
import { Readable, Writable } from 'stream';
export interface PeerConstructorOprions {
    friendly?: boolean;
    name?: string;
}
export interface StreamConstructorObject {
    highWaterMark?: number;
    receiver: EventEmitter;
}
export interface MessageHeaders {
    role?: string;
    event: string;
    timeout?: number;
}
export interface MessageData extends MessageHeaders {
    data: any;
}
export interface MessageOptions {
    event: string;
    timeout?: number;
    unit?: Unit;
}
export interface SingleMessage {
    role: string;
    event: string;
    data: any;
    origin: {
        type: string;
        raw: Buffer;
    };
}
export interface Correlative {
    role: string;
    event: string;
    cb: number;
    data: any;
}
export interface Response {
    cb: number;
    data: any;
}
export interface InitialUnitData {
    id: string;
    peer: Peer;
    meta: PeerMetaData;
    name: string;
    friendly: boolean;
    roles: string[];
}
export interface PeerConfirmData {
    id: string;
    name: string;
    friendly: boolean;
    roles: string[];
    meta: PeerMetaData;
}
export interface PeerMetaData {
    os: string;
    runtime: string;
    time: number;
    uptime: number;
    protocol: string;
}
export interface WebSocketBindData {
    id: string;
    roles: string[];
    name?: string;
    friendly: boolean;
}
export interface AcquaintMessage {
    id: string;
    address: string;
    roles: string[];
}
export interface ListenOptions {
    server?: https.Server | http.Server;
    port?: number;
    ssl?: SecureContextOptions;
    path?: string;
}
export interface AdditionalConnectOptions {
    permanent?: boolean;
}
export interface ContextData extends InitialContextData {
    unit: Unit;
    role: string;
    event: string;
    rtt?: number;
    response?: any;
    error?: any;
    next?: Function;
}
export interface StreamContextData extends InitialStreamContextData, ContextData {
    _correlation: number;
}
export interface InitialContextData {
    data: any;
    type: string;
    origin: {
        raw: Buffer;
        type: string;
    };
    _correlation?: number;
}
export interface InitialStreamContextData extends InitialContextData {
    _ctr: number;
    _correlation: number;
}
export interface ContextDataForReadable extends StreamContextData {
    readable: Readable;
}
export interface ContextDataForWritable extends StreamContextData {
    writable: Writable;
}
export declare type RequestCallbackFunction = (err: string | Error | undefined | null, data: SendableData) => any;
declare type sendableDatum = string | number | Object | Buffer | null | undefined;
export declare type SendableData = sendableDatum | sendableDatum[];
export declare type MessageHandler = (ctx: ContextData) => void;
export declare type RequestHandler = (ctx: ContextData, cb: RequestCallbackFunction) => void;
export declare type WritableHandler = (ctx: ContextDataForWritable, cb: RequestCallbackFunction) => void;
export declare type ReadableHandler = (ctx: ContextDataForReadable, cb: RequestCallbackFunction) => void;
export {};
//# sourceMappingURL=interfaces.d.ts.map