import { Readable, Writable } from 'stream';
import EventEmitter from 'events';
import WebSocket from 'ws';
import { MessageHeaders, InitialUnitData, AcquaintMessage, WebSocketBindData, SendableData, ContextData, PeerMetaData } from './interfaces';
import { Peer } from './Peer';
export declare class Unit extends EventEmitter {
    readonly id: string;
    name: string | undefined;
    _peer: Peer;
    _friendly: boolean;
    _sockets: WebSocket[];
    _roles: string[];
    _reqHandler: EventEmitter;
    _readableHandler: EventEmitter;
    _writableHandler: EventEmitter;
    _streamReceiverEE: EventEmitter;
    _cb: Map<number, Function>;
    _cbid: number;
    _timeouts: Map<number, NodeJS.Timeout>;
    _onCloseHandlers: Set<number>;
    _metaData: PeerMetaData;
    _lastRolesUpdate: number;
    constructor({ peer, id, friendly, name, roles, meta }: InitialUnitData);
    getRoles(): string[];
    readonly meta: PeerMetaData;
    send(params: MessageHeaders, data: any, cb?: Function): void;
    _sendRoles(): void;
    request(params: MessageHeaders, data: any, cb?: (err: Error | null, ctx: ContextData) => void): Promise<any>;
    Writable(headers: MessageHeaders, data?: SendableData, options?: any): Writable;
    Readable(headers: MessageHeaders, data?: any, options?: any, cb?: Function): Readable;
    _acquaint(payload: AcquaintMessage): void;
    _bindWS(ws: WebSocket, { roles, friendly, name }: WebSocketBindData): void;
    close(): void;
}
//# sourceMappingURL=Unit.d.ts.map