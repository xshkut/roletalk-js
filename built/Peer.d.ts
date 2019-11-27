import http, { Server } from 'http';
import https, { Server as httpsServer } from 'https';
import WebSocket from 'ws';
import EventEmitter from 'events';
import { Unit } from './Unit';
import { Destination } from './Destination';
import { Role } from './Role';
import { Auth } from './Auth';
import { PeerConstructorOprions, ListenOptions, AdditionalConnectOptions, WritableHandler, ReadableHandler, RequestHandler, MessageHandler } from './interfaces';
export declare class Peer extends EventEmitter {
    auth: Auth;
    name: string;
    readonly id: string;
    friendly: boolean;
    _units: Map<string, Unit>;
    _destinations: Map<string, Destination>;
    _roles: Map<string, Role>;
    _requestTimeout: number;
    _addressMap: Map<string, Unit | null>;
    _server?: http.Server | https.Server;
    _port?: number;
    _wss?: any;
    _path?: string;
    _listener?: Server | httpsServer;
    _constructed: number;
    _lastRolesUpdate: number;
    constructor(options?: PeerConstructorOprions);
    listen(this: Peer, options: ListenOptions | number, cb?: Function): Promise<Peer>;
    close(cb?: Function): http.Server | https.Server | undefined;
    connect(address: string, options?: WebSocket.ClientOptions & AdditionalConnectOptions, cb?: (err?: Error, res?: {
        unit: Unit;
        ws: WebSocket;
    }) => void): Promise<{
        unit: Unit;
        ws: WebSocket;
    }>;
    destination(name: string): Destination;
    role(name: string, active?: boolean): Role;
    readonly units: Unit[];
    readonly roles: Role[];
    readonly destinations: Destination[];
    onMessage(handler: MessageHandler): void;
    onRequest(handler: RequestHandler): void;
    onReadable(handler: ReadableHandler): void;
    onWritable(handler: WritableHandler): void;
    onData(handler: MessageHandler | RequestHandler | WritableHandler | ReadableHandler): void;
}
export declare function refreshPeerDestinations(this: Peer, unit: Unit): void;
//# sourceMappingURL=Peer.d.ts.map