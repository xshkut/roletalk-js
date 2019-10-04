import { Unit } from "../Unit";
import WebSocket from 'ws'
import { InitialContextData, ContextData } from "../interfaces";

export function receiveResponse(this: Unit, cbid: number, err: any, ctx?: InitialContextData, ws?: WebSocket) {
    if (!this._cb.has(cbid)) {
        return
    }
    let cb = this._cb.get(cbid);
    this._cb.delete(cbid);
    let timeout = this._timeouts.get(cbid) as any;
    ctx = ctx || { unit: this, data: null } as any
    (ctx as ContextData).rtt = Math.ceil(process.uptime() * 1000 - timeout._idleStart);
    (ctx as ContextData).unit = this;
    clearTimeout(timeout);
    this._timeouts.delete(cbid);
    this._onCloseHandlers.delete(cbid);
    cb && (err ? cb(err, ctx) : cb(null, ctx, ws));
}