import { Readable } from 'stream';
import * as WebSocket from 'ws';
import { numberToBuffer } from './numBufConversions';
import {
    STREAM_ERROR_FLAG, STREAM_FINISH_FLAG, STREAM_CHUNK_FLAG, STREAM_BP_QUOTA_FLAG, TYPE_STREAM_MSG
} from '../constants';
import { StreamConstructorObject } from '../interfaces';
import { EventEmitter } from 'events';

/**@internal */
export class ReadableOverWS extends Readable {
    _quotaRemain: number
    _fullQuotaBuffer?: Buffer
    _ws: WebSocket | null = null
    _receiver: EventEmitter
    constructor(opts: StreamConstructorObject) {
        super(opts);
        let { receiver } = opts as StreamConstructorObject;
        this._receiver = receiver;
        this._quotaRemain = this.readableHighWaterMark;
    }
    _read(size: number): void {
        if (this._quotaRemain <= 0) {
            let quotaSize = size;
            this._sendQuota(quotaSize);
        }
    }
    _destroy(error: Error) {
        this._ws && this._ws.readyState === 1 &&
            this._ws.send(Buffer.concat([this._fullQuotaBuffer!, Buffer.from([STREAM_ERROR_FLAG]), Buffer.from(error?.message || '')]));
    }
    _sendQuota(quota: number): void {
        this._ws && this._ws.readyState === 1 &&
            this._ws.send(Buffer.concat([this._fullQuotaBuffer!, Buffer.from([STREAM_BP_QUOTA_FLAG]), numberToBuffer(quota)]));
        this._quotaRemain += quota;
    }
    _bindWS(ws: WebSocket): void {
        let onWSClose = () => {
            this.destroy(new Error(`Underlying socket closed`));
        };
        ws.once('close', onWSClose);
        this.once('end', () => {
            ws.removeListener('close', onWSClose);
        });
        this._ws = ws;
    }
    _setSID(sid: number) {
        let event = numberToBuffer(sid).toString('hex');
        let onPayload = (type: number, chunk: Buffer): void => {
            if (type === STREAM_CHUNK_FLAG) {
                this._quotaRemain -= chunk.length;
                this.push(chunk);
                if (this._quotaRemain <= this.readableHighWaterMark * 0.5) {
                    this._sendQuota(this.readableHighWaterMark - this._quotaRemain);
                }
            } else if (type === STREAM_FINISH_FLAG) {
                this.push(null);
            } else if (type === STREAM_ERROR_FLAG) {
                let error = new Error(`Remote writable stream emitted error: ${chunk.toString()}`)
                this.emit('error', error);
            }
        };
        this.once('close', () => {
            this._receiver.removeListener(event, onPayload);
        });
        this._receiver.on(event, onPayload);
    }
    _setBPID(bpid: number) {
        let bpidBuffer = numberToBuffer(bpid);
        let lengthBuffer = Buffer.from([bpidBuffer.length]);
        this._fullQuotaBuffer = Buffer.concat([Buffer.from([TYPE_STREAM_MSG]), lengthBuffer, bpidBuffer]);
    }
}