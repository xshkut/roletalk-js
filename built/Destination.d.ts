/// <reference types="node" />
import { Unit } from './Unit';
import { EventEmitter } from 'events';
import { EmitOptions, Context, sendableData } from './interfaces';
import { Readable, Writable, ReadableOptions, WritableOptions } from 'stream';
import { Peer } from './Peer';
export declare class Destination extends EventEmitter {
    private _name;
    private _ready;
    private _peer;
    constructor(name: string, peer: Peer);
    get units(): Unit[];
    get name(): string;
    send(event: string | EmitOptions, data: sendableData, cb?: (err: Error) => {}): Unit | undefined;
    broadcast(event: string | EmitOptions, data: sendableData): void;
    request(event: string | EmitOptions, data: sendableData, cb?: (err: Error | null, ctx: Context) => void): Promise<Context>;
    survey(event: string | EmitOptions, data: sendableData, cb: (err: Error | null, ctx: Context) => void): number;
    Readable(event: string | EmitOptions, data: sendableData, options?: ReadableOptions): Readable;
    Writable(event: string | EmitOptions, data: sendableData, options?: WritableOptions): Writable;
    get ready(): boolean;
}
export interface Destination {
    on(event: 'close', handler: () => void): this;
    on(event: 'unit', handler: (unit: Unit) => void): this;
}
//# sourceMappingURL=Destination.d.ts.map