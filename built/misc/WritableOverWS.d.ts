import { Writable } from 'stream';
import EventEmitter from 'events';
import { StreamConstructorObject } from '../interfaces';
import WebSocket from 'ws';
export declare class WritableOverWS extends Writable {
    _receiver: EventEmitter;
    _quotaRemain: number;
    _fullCBBuffer?: Buffer;
    _ws: WebSocket | null;
    _bpEvent?: string;
    constructor(opts: StreamConstructorObject);
    _final(cb: (error: Error | null | undefined) => void): void;
    _write(chunk: Buffer, enc?: string, callback?: (err: Error | null | undefined) => void): void;
    _writev(chunks: [{
        chunk: Buffer;
        encoding: string;
    }], callback?: any): void;
    _bindWS(ws: WebSocket): void;
    _setBPID(bpid: number): void;
    _setSID(sid: number): void;
}
//# sourceMappingURL=WritableOverWS.d.ts.map