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
    receiver: EventEmitter
}

export interface MessageHeaders {
    role?: string,
    event: string,
    timeout?: number
}

export interface MessageData extends MessageHeaders {
    data: any
}

export interface MessageOptions {
    event: string,
    timeout?: number //for requests only,
    unit?: Unit //send to specific unit
}

export interface SingleMessage {
    role: string, event: string, data: any, origin: {
        type: string,
        raw: Buffer
    },
}
export interface Correlative {
    role: string, event: string, cb: number, data: any
}
export interface Response {
    cb: number, data: any
}

export interface InitialUnitData {
    id: string;
    peer: Peer;
    meta: PeerMetaData,
    name: string,
    friendly: boolean,
    roles: string[]
}

export interface PeerConfirmData {
    id: string;
    name: string;
    friendly: boolean;
    roles: string[];
    meta: PeerMetaData
}

export interface PeerMetaData {
    os: string;
    runtime: string
    time: number;
    uptime: number
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
    // wss?: any;
    server?: https.Server | http.Server;
    port?: number;
    ssl?: SecureContextOptions;
    path?: string
}

export interface AdditionalConnectOptions {
    permanent?: boolean
}

export interface ContextData extends InitialContextData {
    unit: Unit,
    role: string,
    event: string,
    rtt?: number //for responses only
    response?: any; //for arbitrary use, e.g. middleware
    error?: any; //for arbitrary use, e.g. middleware
    next?: Function //wait untin response
}

export interface StreamContextData extends InitialStreamContextData, ContextData {
    _correlation: number
}


export interface InitialContextData {
    data: any,
    type: string,
    origin: {
        raw: Buffer,
        type: string
    }
    _correlation?: number, //for requests and responses only
}

export interface InitialStreamContextData extends InitialContextData {
    _ctr: number;
    _correlation: number,
}

export interface ContextDataForReadable extends StreamContextData {
    readable: Readable
}

export interface ContextDataForWritable extends StreamContextData {
    writable: Writable
}

export type RequestCallbackFunction = (err: string | Error | undefined | null, data: SendableData) => any

type sendableDatum = string | number | Object | Buffer | null | undefined
export type SendableData = sendableDatum | sendableDatum[]

export type MessageHandler = (ctx: ContextData) => void;
export type RequestHandler = (ctx: ContextData, cb: RequestCallbackFunction) => void;
export type WritableHandler = (ctx: ContextDataForWritable, cb: RequestCallbackFunction) => void
export type ReadableHandler = (ctx: ContextDataForReadable, cb: RequestCallbackFunction) => void