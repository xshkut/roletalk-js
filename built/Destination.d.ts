import { SetWithRoundRobin } from './misc/SetWithRoundRobin';
import { Unit } from './Unit';
import { EventEmitter } from 'events';
import { MessageHeaders, MessageOptions, ContextData, SendableData } from './interfaces';
import { Readable, Writable, ReadableOptions, WritableOptions } from 'stream';
import { Peer } from './Peer';
export declare class Destination extends EventEmitter {
    private _name;
    private _ready;
    _set: SetWithRoundRobin<Unit>;
    private _peer;
    constructor(name: string, peer: Peer);
    readonly units: Unit[];
    readonly name: string;
    send(event: string | MessageOptions, data: SendableData): Unit | undefined;
    broadcast(event: string | MessageHeaders, data: SendableData): void;
    request(event: string | MessageOptions, data: SendableData, cb?: (err: Error | null, ctx: ContextData) => void): Promise<any>;
    survey(event: string | MessageHeaders, data: SendableData, cb: (err: Error | null, ctx: ContextData) => void): number;
    Readable(event: string | MessageOptions, data: SendableData, options?: ReadableOptions): Readable;
    Writable(event: string | MessageOptions, data: SendableData, options?: WritableOptions, cb?: Function): Writable;
    _addUnit(unit: Unit): void;
    _deleteUnit(unit: Unit): void;
    readonly ready: boolean;
}
//# sourceMappingURL=Destination.d.ts.map