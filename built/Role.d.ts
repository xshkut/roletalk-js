import EventEmitter from 'events';
import { Peer } from '.';
import { ContextData, ContextDataForReadable, ContextDataForWritable, RequestCallbackFunction, MessageHandler, RequestHandler, ReadableHandler, WritableHandler } from './interfaces';
export declare class Role extends EventEmitter {
    _msgHandler: EventEmitter;
    _reqHandler: EventEmitter;
    _readableHandler: EventEmitter;
    _writableHandler: EventEmitter;
    readonly name: string;
    _peer: Peer;
    _active: boolean;
    constructor(name: string, peer: Peer, active?: boolean);
    onMessage(msg: string | MessageHandler, handler?: MessageHandler): EventEmitter | undefined;
    onRequest(msg: string | RequestHandler, handler?: RequestHandler): EventEmitter | undefined;
    onReadable(msg: string, handler: ReadableHandler): EventEmitter | undefined;
    onWritable(msg: string | WritableHandler, handler?: WritableHandler): EventEmitter | undefined;
    onData(handler: MessageHandler | RequestHandler | WritableHandler | ReadableHandler): void;
    disable(): void;
    enable(): void;
    readonly active: boolean;
    _emitMsg(ctx: ContextData): void;
    _emitReq(ctx: ContextData, cb: RequestCallbackFunction): void;
    _emitReadable(ctx: ContextDataForReadable, cb: RequestCallbackFunction): void;
    _emitWritable(ctx: ContextDataForWritable, cb: RequestCallbackFunction): void;
}
//# sourceMappingURL=Role.d.ts.map