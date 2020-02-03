/// <reference types="node" />
import { EventEmitter } from 'events';
import { Peer } from './Peer';
import { MessageHandler, RequestHandler, ReadableHandler, WritableHandler } from './interfaces';
export declare class Role extends EventEmitter {
    readonly name: string;
    constructor(name: string, peer: Peer, active?: boolean);
    onMessage(msg: string | MessageHandler, handler?: MessageHandler): EventEmitter | undefined;
    onRequest(msg: string | RequestHandler, handler?: RequestHandler): EventEmitter | undefined;
    onReadable(msg: string, handler: ReadableHandler): EventEmitter | undefined;
    onWritable(msg: string | WritableHandler, handler?: WritableHandler): EventEmitter | undefined;
    onData(handler: MessageHandler | RequestHandler | WritableHandler | ReadableHandler): void;
    disable(): void;
    enable(): void;
    get active(): boolean;
}
//# sourceMappingURL=Role.d.ts.map