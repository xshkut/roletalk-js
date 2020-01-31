/// <reference types="node" />
import { Unit } from './Unit';
import { EventEmitter } from 'events';
import { MessageHeaders, MessageOptions, Context, sendableData } from './interfaces';
import { Readable, Writable, ReadableOptions, WritableOptions } from 'stream';
import { Peer } from './Peer';
export declare class Destination extends EventEmitter {
    private _name;
    private _ready;
    private _peer;
    constructor(name: string, peer: Peer);
    readonly units: Unit[];
    readonly name: string;
    send(event: string | MessageOptions, data: sendableData, cb?: (err: Error) => {}): Unit | undefined;
    broadcast(event: string | MessageHeaders, data: sendableData): void;
    request(event: string | MessageOptions, data: sendableData, cb?: (err: Error | null, ctx: Context) => void): Promise<Context>;
    survey(event: string | MessageHeaders, data: sendableData, cb: (err: Error | null, ctx: Context) => void): number;
    Readable(event: string | MessageOptions, data: sendableData, options?: ReadableOptions): Readable;
    Writable(event: string | MessageOptions, data: sendableData, options?: WritableOptions): Writable;
    readonly ready: boolean;
}
export interface Destination {
    on(event: 'close', handler: () => void): this;
    on(event: 'unit', handler: (unit: Unit) => void): this;
}
//# sourceMappingURL=Destination.d.ts.map