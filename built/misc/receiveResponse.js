"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function receiveResponse(cbid, err, ctx, ws) {
    if (!this._cb.has(cbid)) {
        return;
    }
    let cb = this._cb.get(cbid);
    this._cb.delete(cbid);
    let timeout = this._timeouts.get(cbid);
    ctx = ctx || { unit: this, data: null };
    ctx.rtt = Math.ceil(process.uptime() * 1000 - timeout._idleStart);
    ctx.unit = this;
    clearTimeout(timeout);
    this._timeouts.delete(cbid);
    this._onCloseHandlers.delete(cbid);
    cb && (err ? cb(err, ctx) : cb(null, ctx, ws));
}
exports.receiveResponse = receiveResponse;
//# sourceMappingURL=receiveResponse.js.map