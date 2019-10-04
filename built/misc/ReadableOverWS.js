"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stream_1 = require("stream");
const numBufConversions_1 = require("./numBufConversions");
const constants_1 = require("../constants");
class ReadableOverWS extends stream_1.Readable {
    constructor(opts) {
        super(opts);
        this._ws = null;
        let { receiver } = opts;
        this._receiver = receiver;
        this._quotaRemain = this.readableHighWaterMark;
    }
    _read(size) {
        if (this._quotaRemain <= 0) {
            let quotaSize = size;
            this._sendQuota(quotaSize);
        }
    }
    _destroy(error) {
        this._ws && this._ws.readyState === 1 &&
            this._ws.send(Buffer.concat([this._fullQuotaBuffer, Buffer.from([constants_1.STREAM_ERROR_FLAG]), Buffer.from(error.message)]));
    }
    _sendQuota(quota) {
        this._ws && this._ws.readyState === 1 &&
            this._ws.send(Buffer.concat([this._fullQuotaBuffer, Buffer.from([constants_1.STREAM_BP_QUOTA_FLAG]), numBufConversions_1.numberToBuffer(quota)]));
        this._quotaRemain += quota;
    }
    _bindWS(ws) {
        let onWSClose = () => {
            this.destroy(new Error(`Underlying socket closed`));
        };
        ws.once('close', onWSClose);
        this.once('end', () => {
            ws.removeListener('close', onWSClose);
        });
        this._ws = ws;
    }
    _setSID(sid) {
        let event = numBufConversions_1.numberToBuffer(sid).toString('hex');
        let onPayload = (type, chunk) => {
            if (type === constants_1.STREAM_CHUNK_FLAG) {
                this._quotaRemain -= chunk.length;
                this.push(chunk);
                if (this._quotaRemain <= this.readableHighWaterMark * 0.5) {
                    this._sendQuota(this.readableHighWaterMark - this._quotaRemain);
                }
            }
            else if (type === constants_1.STREAM_FINISH_FLAG) {
                this.push(null);
            }
            else if (type === constants_1.STREAM_ERROR_FLAG) {
                let error = new Error(`Remote writable stream emitted error: ${chunk.toString()}`);
                this.emit('error', error);
            }
        };
        this.once('close', () => {
            this._receiver.removeListener(event, onPayload);
        });
        this._receiver.on(event, onPayload);
    }
    _setBPID(bpid) {
        let bpidBuffer = numBufConversions_1.numberToBuffer(bpid);
        let lengthBuffer = Buffer.from([bpidBuffer.length]);
        this._fullQuotaBuffer = Buffer.concat([Buffer.from([constants_1.TYPE_STREAM_MSG]), lengthBuffer, bpidBuffer]);
    }
}
exports.ReadableOverWS = ReadableOverWS;
//# sourceMappingURL=ReadableOverWS.js.map