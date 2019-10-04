"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stream_1 = require("stream");
const numBufConversions_1 = require("./numBufConversions");
const constants_js_1 = require("../constants.js");
const constants_1 = require("./../constants");
const bufferForChunk = Buffer.from([constants_js_1.STREAM_CHUNK_FLAG]);
const wsSendOptions = {
    binary: true
};
class WritableOverWS extends stream_1.Writable {
    constructor(opts) {
        super(opts);
        this._ws = null;
        let { receiver } = opts;
        this._receiver = receiver;
        this._quotaRemain = this.writableHighWaterMark;
        this.once('error', (err) => {
            if (this._ws) {
                this._ws.readyState === 1 &&
                    this._ws.send(Buffer.concat([
                        this._fullCBBuffer,
                        Buffer.from([constants_js_1.STREAM_ERROR_FLAG]),
                        (err && Buffer.from(err.toString())) || Buffer.from('')
                    ]), wsSendOptions);
            }
            else {
                this.once('_ws', () => {
                    this._ws &&
                        this._ws.readyState === 1 &&
                        this._ws.send(Buffer.concat([
                            this._fullCBBuffer,
                            Buffer.from([constants_js_1.STREAM_ERROR_FLAG]),
                            (err && Buffer.from(err.toString())) || Buffer.from('')
                        ]), wsSendOptions);
                });
            }
        });
    }
    _final(cb) {
        if (!this._ws) {
            this.once('_ws', () => this._ws.send(Buffer.concat([this._fullCBBuffer, Buffer.from([constants_js_1.STREAM_FINISH_FLAG])]), {
                binary: true
            }, cb));
            return;
        }
        this._ws.send(Buffer.concat([this._fullCBBuffer, Buffer.from([constants_js_1.STREAM_FINISH_FLAG])]), {
            binary: true
        }, cb);
    }
    _write(chunk, enc, callback) {
        if (!this._ws) {
            this.once('_ws', () => this._write(chunk, enc, callback));
            return;
        }
        if (this._quotaRemain <= 0) {
            this._receiver.once(this._bpEvent, () => {
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
        let datum = Buffer.concat([this._fullCBBuffer, bufferForChunk, chunk]);
        this._ws.send(datum, wsSendOptions, callback);
    }
    _writev(chunks, callback) {
        this._write(Buffer.concat(chunks.map((val) => { return val.chunk; })), undefined, callback);
    }
    _bindWS(ws) {
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
    _setBPID(bpid) {
        if (!bpid) {
            throw new Error('empty bpid');
        }
        this._bpEvent = numBufConversions_1.numberToBuffer(bpid).toString('hex');
        this._receiver.on(this._bpEvent, (type, chunk) => {
            if (type === constants_1.STREAM_BP_QUOTA_FLAG) {
                this._quotaRemain = numBufConversions_1.bufferToNumber(chunk);
            }
            else if (type === constants_js_1.STREAM_ERROR_FLAG) {
                this.emit('error', new Error(`Remote readable stream sent error: ${chunk.toString()}`));
            }
        });
        this.once('close', () => {
            this._receiver.removeAllListeners(this._bpEvent);
        });
    }
    _setSID(sid) {
        let cbBufferSid = numBufConversions_1.numberToBuffer(sid);
        let lengthBuffer = Buffer.from([cbBufferSid.length]);
        this._fullCBBuffer = Buffer.concat([Buffer.from([constants_js_1.TYPE_STREAM_MSG]), lengthBuffer, cbBufferSid]);
    }
}
exports.WritableOverWS = WritableOverWS;
//# sourceMappingURL=WritableOverWS.js.map