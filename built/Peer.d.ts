/// <reference types="node" />
import * as http from 'http';
import * as https from 'https';
import * as WebSocket from 'ws';
import { EventEmitter } from 'events';
import { Unit } from './Unit';
import { Destination } from './Destination';
import { Role } from './Role';
import { PeerConstructorOptions, ListenOptions, ConnectOptions, WritableHandler, ReadableHandler, RequestHandler, MessageHandler } from './interfaces';
export declare class Peer extends EventEmitter {
    name: string;
    readonly id: string;
    friendly: boolean;
    constructor(options?: PeerConstructorOptions);
    addPresharedKey(id: string, key: string): void;
    listen(this: Peer, options: ListenOptions | number, cb?: Function): Promise<Peer>;
    close(cb?: (err?: Error) => void): http.Server | https.Server | undefined;
    connect(address: string, options?: WebSocket.ClientOptions & ConnectOptions, cb?: (err?: Error, res?: {
        unit: Unit;
        ws: WebSocket;
    }) => void): Promise<{
        unit: Unit;
        ws: WebSocket;
    }>;
    destination(name: string): Destination;
    role(name: string, active?: boolean): Role;
    get units(): Unit[];
    get roles(): Role[];
    get destinations(): Destination[];
    onMessage(handler: MessageHandler): void;
    onRequest(handler: RequestHandler): void;
    onReadable(handler: ReadableHandler): void;
    onWritable(handler: WritableHandler): void;
    onData(handler: MessageHandler | RequestHandler | WritableHandler | ReadableHandler): void;
}
export interface Peer {
    on(event: 'close', handler: () => void): this;
    on(event: 'unit', handler: (unit: Unit) => void): this;
    on(event: 'role', handler: (role: Role) => void): this;
}
export declare const PEER_RECONNECT_SUCCESS_EVENT = "reconnect_success";
export declare const PEER_RECONNECT_FAIL_EVENT = "reconnect_fail";
//# sourceMappingURL=Peer.d.ts.map