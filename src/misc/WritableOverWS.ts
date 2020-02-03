import { Writable } from 'stream';
import { EventEmitter } from 'events';
import { bufferToNumber, numberToBuffer } from './numBufConversions';
import {
    STREAM_ERROR_FLAG,
    STREAM_FINISH_FLAG,
    STREAM_CHUNK_FLAG,
    TYPE_STREAM_MSG
} from '../constants.js';
import { StreamConstructorObject } from '../interfaces';
import * as WebSocket from 'ws';
import { STREAM_BP_QUOTA_FLAG } from './../constants';

const bufferForChunk = Buffer.from([STREAM_CHUNK_FLAG]);
const wsSendOptions = {
    binary: true
};

/**@internal */
export class WritableOverWS extends Writable {
    _receiver: EventEmitter;
    _quotaRemain: number;
    _fullCBBuffer?: Buffer;
    _ws: WebSocket | null = null
    _bpEvent?: string;
    constructor(opts: StreamConstructorObject) {
        super(opts as any);
        let { receiver } = opts;
        this._receiver = receiver;
        this._quotaRemain = this.writableHighWaterMark;
        this.once('error', (err) => {
            if (this._ws) {
                this._ws.readyState === 1 &&
                    this._ws.send(
                        Buffer.concat([
                            this._fullCBBuffer!,
                            Buffer.from([STREAM_ERROR_FLAG]),
                            (err && Buffer.from(err.toString())) || Buffer.from('')
                        ]),
                        wsSendOptions
                    );
            } else {
                this.once('_ws', () => {
                    this._ws &&
                        this._ws.readyState === 1 &&
                        this._ws.send(
                            Buffer.concat([
                                this._fullCBBuffer!,
                                Buffer.from([STREAM_ERROR_FLAG]),
                                (err && Buffer.from(err.toString())) || Buffer.from('')
                            ]),
                            wsSendOptions
                        );
                });
            }
        });

    }
    _final(cb: (error: Error | null | undefined) => void): void {
        if (!this._ws) {
            this.once('_ws', () => this._ws!.send(
                Buffer.concat([this._fullCBBuffer!, Buffer.from([STREAM_FINISH_FLAG])]),
                {
                    binary: true
                },
                cb
            ));
            return
        }
        this._ws.send(
            Buffer.concat([this._fullCBBuffer!, Buffer.from([STREAM_FINISH_FLAG])]),
            {
                binary: true
            },
            cb
        );
    }
    _write(chunk: Buffer, enc?: string, callback?: (err: Error | null | undefined) => void): void {
        if (!this._ws) {
            this.once('_ws', () => this._write(chunk, enc, callback));
            return;
        }
        if (this._quotaRemain <= 0) {
            this._receiver.once(this._bpEvent!, () => {
                this._write(chunk, enc, callback);
            });
            return;
        }
        if (this._ws.readyState !== 1) {
            callback && callback(new Error('Underlying socket has benn closed. Stream can not write data anymore'));
            this.destroy(new Error('Underlying socket has benn closed. Stream can not write data anymore'));
            return;
        }
        chunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, enc);
        this._quotaRemain -= chunk.length;
        let datum = Buffer.concat([this._fullCBBuffer!, bufferForChunk, chunk]);
        this._ws.send(datum, wsSendOptions, callback);
    }
    _writev(chunks: [{ chunk: Buffer, encoding: string }], callback?: any) {
        this._write(Buffer.concat(chunks.map((val) => { return val.chunk })), undefined, callback);
    }
    _bindWS(ws: WebSocket) {
        let onWSClose = () => {
            this.destroy(new Error(`Socket closed`));
        };
        ws.once('close', onWSClose);
        this.once('finish', () => {
            ws.removeListener('close', onWSClose);
        });
        this._ws = ws;
        this.emit('_ws');
        this.once('close', () => this._ws && this._ws.removeListener('close', onWSClose));
    }
    _setBPID(bpid: number) {
        if (!bpid) {
            throw new Error('empty bpid');
        }
        this._bpEvent = numberToBuffer(bpid).toString('hex');
        this._receiver.on(this._bpEvent!, (type: number, chunk: Buffer) => {
            if (type === STREAM_BP_QUOTA_FLAG) {
                this._quotaRemain = bufferToNumber(chunk);
            } else if (type === STREAM_ERROR_FLAG) {
                this.emit('error', new Error(`Remote readable stream sent error: ${chunk.toString()}`));
            }
        });
        this.once('close', () => {
            this._receiver.removeAllListeners(this._bpEvent);
        })
    }
    _setSID(sid: number) {
        let cbBufferSid = numberToBuffer(sid);
        let lengthBuffer = Buffer.from([cbBufferSid.length]);
        this._fullCBBuffer = Buffer.concat([Buffer.from([TYPE_STREAM_MSG]), lengthBuffer, cbBufferSid]);
    }
}