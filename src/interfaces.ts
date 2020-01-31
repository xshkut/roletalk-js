import { EventEmitter } from 'events';
import { Peer } from '.';
import { SecureContextOptions } from 'tls';
import https from 'https';
import http from 'http';
import { Unit } from './Unit';
import { Readable, Writable } from 'stream';

/**Options for Peer constructor
 */
export interface PeerConstructorOptions {
    friendly?: boolean;
    /**Name of peer which could be read by remote peers (units) */
    name?: string;
}

/**@internal */
export interface StreamConstructorObject {
    highWaterMark?: number;
    receiver: EventEmitter
}

/**@internal */
export interface MessageHeaders {
    role?: string,
    event: string,
    timeout?: number
}

export interface MessageOptions {
    event: string,
    timeout?: number //for requests only,
    unit?: Unit //send to specific unit
}

/**@internal */
export interface InitialUnitData {
    id: string;
    peer: Peer;
    meta: PeerMetaData,
    name: string,
    friendly: boolean,
    roles: string[]
}

/**@internal */
export interface PeerConfirmData {
    id: string;
    name: string;
    friendly: boolean;
    roles: string[];
    meta: PeerMetaData
}

/**Meta data of peer. This part is not tested and therefore is not reliable*/
export interface PeerMetaData {
    /**Operational system*/
    os: string;
    /**Runtime running the process*/
    runtime: string
    /**Time when unit was connected*/
    time: number;
    /**Time elapsed between unit spawned and connected to the peer*/
    uptime: number
    /**Data transmition protocol version. If it is semver-incompatible, connection should be rejected*/
    protocol: string
}

/**@internal */
export interface WebSocketBindData {
    id: string;
    roles: string[];
    name?: string;
    friendly: boolean;
}

/**@internal */
export interface AcquaintMessage {
    id: string;
    address: string;
    roles: string[];
}

/**Options to listen for incoming connections*/
export interface ListenOptions {
    /**http.Server instance. If provided, peer will not listen immediately*/
    server?: https.Server | http.Server;
    /**Number of port to listen on */
    port?: number;
    /**Provide options to listen accept only WSS connections*/
    ssl?: SecureContextOptions;
    /**Path to handle incoming connections*/
    path?: string
}

/**@internal */
export interface AdditionalConnectOptions {
    permanent?: boolean
}

/**@internal */
export interface InitialContext {
    data: any,
    type: string,
    origin: {
        raw: Buffer,
        type: string
    }
    /**@internal */
    _correlation?: number, //for requests and responses only
}

export interface Context extends InitialContext {
    /**Payload of incoming message. Can be reassigned in middleware */
    data: any,
    /**Type of data. Can be reassigned in middleware */
    type: string,
    /**Original data. Should not be reassigned */
    origin: {
        /**Payload in binary representation */
        raw: Buffer,
        /**Type of payload */
        type: string
    }
    /**[[Unit]] who sent the message (response) */
    unit: Unit,
    /**Name of [[Role]] to which the message belongs */
    role: string,
    /**Name of event to which the message belongs */
    event: string,
    /**You can reassign this property in middleware. If error property is defined,  */
    response?: any;
    /**You can reassign this property in middleware */
    error?: any;
    /**Round-trip time. Fom responses only*/
    rtt?: number
    /**wait untin next response handler will process the context. Use in middleware */
    next?(): Promise<void>
}

/**@internal */
export interface StreamContext extends InitialStreamContext, Context {
    /**@internal */
    _correlation: number
}


/**@internal */
export interface rolesMsg {
    i: number,
    roles: string[]
}

/**@internal */
export interface InitialStreamContext extends InitialContext {
    /**@internal */
    _ctr: number;
    /**@internal */
    _correlation: number
}

export interface ContextForReadable extends StreamContext {
    readable: Readable
}

export interface ContextForWritable extends StreamContext {
    writable: Writable
}

//Function used to handle incoming requests
export type RequestCallbackFunction = (err: Error | null, data: sendableData) => void

/**Any data which can be sent except functions */
type sendableDatum = string | number | Object | Buffer | null | undefined
/**Any data which can be sent except functions */
export type sendableData = sendableDatum | sendableDatum[]

/**Handler function for incoming messages and response (including one for streams) */
export type MessageHandler = (ctx: Context) => void;
/**Handler function for incoming requests */
export type RequestHandler = (ctx: Context, cb: RequestCallbackFunction) => void;
/**Handler function for incoming requests to establish binary stream session. This end if the stream will be writable */
export type WritableHandler = (ctx: ContextForWritable, cb: RequestCallbackFunction) => void
/**Handler function for incoming requests to establish binary stream session. This end if the stream will be readable */
export type ReadableHandler = (ctx: ContextForReadable, cb: RequestCallbackFunction) => void