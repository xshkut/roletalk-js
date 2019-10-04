import { Readable } from 'stream';
import WebSocket from 'ws';
import { StreamConstructorObject } from '../interfaces';
import { EventEmitter } from 'events';
export declare class ReadableOverWS extends Readable {
    _quotaRemain: number;
    _fullQuotaBuffer?: Buffer;
    _ws: WebSocket | null;
    _receiver: EventEmitter;
    constructor(opts: StreamConstructorObject);
    _read(size: number): void;
    _destroy(error: Error): void;
    _sendQuota(quota: number): void;
    _bindWS(ws: WebSocket): void;
    _setSID(sid: number): void;
    _setBPID(bpid: number): void;
}
//# sourceMappingURL=ReadableOverWS.d.ts.map