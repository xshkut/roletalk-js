import { Unit } from "../Unit";
import * as WebSocket from 'ws'
import { InitialContext, Context } from "../interfaces";

/**@internal */
export function receiveResponse(this: Unit, cbid: number, err: any, ctx?: InitialContext, ws?: WebSocket) {
    if (!this._cb.has(cbid)) {
        return
    }
    let cb = this._cb.get(cbid);
    this._cb.delete(cbid);
    let timeout = this._timeouts.get(cbid) as any;
    ctx = ctx || { unit: this, data: null } as any
    (ctx as Context).rtt = Math.ceil(process.uptime() * 1000 - timeout._idleStart);
    (ctx as Context).unit = this;
    clearTimeout(timeout);
    this._timeouts.delete(cbid);
    this._onCloseHandlers.delete(cbid);
    cb && (err ? cb(err, ctx) : cb(null, ctx, ws));
}