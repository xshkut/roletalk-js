import { EventEmitter } from "events";
import { Peer } from "./Peer";
import { SecureContextOptions } from "tls";
import { Server } from "https";
import { Server as httpServer } from "http";
import { Unit } from "./Unit";
import { Readable, Writable } from "stream";

/**Options for Peer constructor */
export interface PeerOptions {
  /**Whether should this peer be acquainted with others when it gets connected to another unit */
  friendly?: boolean;
  /**Name of peer which could be read by remote peers (units) */
  name?: string;
}

/**@internal */
export interface StreamConstructorObject {
  highWaterMark?: number;
  receiver: EventEmitter;
}

/**@internal */
export interface MessageHeaders {
  role?: string;
  event: string;
  timeout?: number;
}

/**Options that determine how [[Destination]] will act */
export interface EmitOptions {
  /**Name of event which should be handled by unit's [[Role]]*/
  event: string;
  /**Request timeout*/
  timeout?: number; //for requests only,
  /**[[Unit]] which should receive message. If [[Destination]] has not such unit method will throw an error */
  unit?: Unit; //send to specific unit
}

/**@internal */
export interface InitialUnitData {
  id: string;
  peer: Peer;
  meta: PeerMetaData;
  name: string;
  friendly: boolean;
  roles: string[];
  tags: {
    [key: string]: string;
  };
}

/**@internal */
export interface PeerConfirmData {
  id: string;
  name: string;
  friendly: boolean;
  roles: string[];
  meta: PeerMetaData;
  tags: {
    [key: string]: string;
  };
}

/**Meta data of peer. This part is not tested and therefore is not reliable*/
export interface PeerMetaData {
  /**Operational system*/
  os: string;
  /**Runtime running the process*/
  runtime: string;
  /**Time when unit was connected*/
  time: number;
  /**Time elapsed between unit spawned and connected to the peer*/
  uptime: number;
  /**Data transmition protocol version. If it is semver-incompatible, connection should be rejected*/
  protocol: string;
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
  /**Number of port to listen on */
  port?: number;
  /**Host to bind listener */
  host?: string;
  /**http.Server instance. If provided, peer will not listen immediately*/
  server?: Server | httpServer;
  /**Provide options to listen accept only WSS connections*/
  ssl?: SecureContextOptions;
  /**Path to handle incoming connections*/
  path?: string;
}

/**Additional options for outgoing connection */
export interface ConnectOptions {
  /**Permanent connection will try to reconnect after abort */
  permanent?: boolean;
}

/**@internal */
export interface InitialContext {
  data: any;
  type: string;
  origin: {
    raw: Buffer;
    type: string;
  };
  /**@internal */
  _correlation?: number; //for requests and responses only
}

export interface Context {
  /**Payload of incoming message. Can be reassigned in middleware */
  data: any;
  /**Type of data. Can be reassigned in middleware */
  type: string;
  /**Original data. Should not be reassigned */
  origin: {
    /**Payload in binary representation */
    raw: Buffer;
    /**Type of payload */
    type: string;
  };
  /**[[Unit]] who sent the message (response) */
  unit: Unit;
  /**Name of [[Role]] to which the message belongs */
  role: string;
  /**Name of event to which the message belongs */
  event: string;
  /**You can reassign this property in middleware. If error property is defined,  */
  response?: any;
  /**You can reassign this property in middleware */
  error?: any;
  /**Round-trip time. Fom responses only*/
  rtt?: number;
  /**wait untin next response handler will process the context. Use in middleware */
  next?(): Promise<void>;
  /**@internal
   * for requests and responses only, internal property
   */
  _correlation?: number;
}

/**@internal */
export interface StreamContext extends InitialStreamContext, Context {}

/**@internal */
export interface rolesMsg {
  i: number;
  roles: string[];
}

/**@internal */
export interface InitialStreamContext extends InitialContext {
  /**@internal */
  _ctr: number;
}

export interface ContextForReadable extends Context {
  readable: Readable;
  /**@internal */
  _ctr: number;
}

export interface ContextForWritable extends Context {
  writable: Writable;
  /**@internal */
  _ctr: number;
}

/**Function used to handle incoming requests */
export type RequestCallback = (err: Error | null, data: sendableData) => void;

/**Any data which can be sent except functions */
type sendableDatum = string | number | Object | Buffer | null | undefined;
/**Any data which can be sent except functions */
export type sendableData = sendableDatum | sendableDatum[];

/**Handler function for incoming messages and response (including one for streams) */
export type MessageHandler = (ctx: Context) => void;
/**Handler function for incoming requests */
export type RequestHandler = (ctx: Context, cb: RequestCallback) => void;
/**Handler function for incoming requests to establish binary stream session. This end if the stream will be writable */
export type WritableHandler = (
  ctx: ContextForWritable,
  cb: RequestCallback
) => void;
/**Handler function for incoming requests to establish binary stream session. This end if the stream will be readable */
export type ReadableHandler = (
  ctx: ContextForReadable,
  cb: RequestCallback
) => void;
