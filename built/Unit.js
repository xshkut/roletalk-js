"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = __importDefault(require("events"));
const ReadableOverWS_1 = require("./misc/ReadableOverWS");
const WritableOverWS_1 = require("./misc/WritableOverWS");
const getFreeCallbackIDForEE_1 = require("./misc/getFreeCallbackIDForEE");
const constants_1 = require("./constants");
const Peer_1 = require("./Peer");
const protocolConversions_1 = require("./misc/protocolConversions");
const receiveResponse_1 = require("./misc/receiveResponse");
class Unit extends events_1.default {
    constructor({ peer, id, friendly, name, roles, meta }) {
        super();
        this.name = undefined;
        this._sockets = [];
        this._roles = [];
        this._reqHandler = new events_1.default();
        this._readableHandler = new events_1.default();
        this._writableHandler = new events_1.default();
        this._streamReceiverEE = new events_1.default();
        this._cb = new Map();
        this._cbid = 0;
        this._timeouts = new Map();
        this._onCloseHandlers = new Set();
        this._lastRolesUpdate = 0;
        this.id = id;
        this.name = name;
        this._peer = peer;
        this._friendly = friendly;
        this._roles = roles;
        this._metaData = meta;
        this.once('error', err => {
            this.close();
        });
    }
    getRoles() {
        return this._roles;
    }
    get meta() {
        return this._metaData;
    }
    send(params, data, cb) {
        let datum = protocolConversions_1.serializeSingle(constants_1.TYPE_MSG, params.role, params.event, data);
        sendViaAny(this, datum, cb);
    }
    _sendRoles() {
        let msg = { i: this._peer._lastRolesUpdate, roles: this._peer.roles.filter(role => role.active).map(role => role.name) };
        let data = JSON.stringify(msg);
        let datum = protocolConversions_1.serializeString(constants_1.TYPE_ROLES, data);
        sendViaAny(this, datum);
    }
    request(params, data, cb) {
        if (cb) {
            sendRequest.call(this, params, data, cb);
        }
        else {
            return new Promise((resolve, reject) => sendRequest.call(this, params, data, (err, res) => (err ? reject(err) : resolve(res))));
        }
        return null;
    }
    Writable(headers, data, options) {
        return openWritableStream.call(this, headers, data, options);
    }
    Readable(headers, data, options, cb) {
        if (typeof data === 'function') {
            cb = data;
            data = undefined;
        }
        else if (typeof options === 'function') {
            cb = options;
            options = undefined;
        }
        return openReadableStream.call(this, headers, data, options);
    }
    _acquaint(payload) {
        let data = JSON.stringify(payload);
        let datum = protocolConversions_1.serializeString(constants_1.TYPE_ACQUAINT, data);
        sendViaAny(this, datum);
    }
    _bindWS(ws, { roles, friendly, name }) {
        this._sockets.push(ws);
        createHeartBeat(ws);
        ws.on('message', (datum) => handlePayload.call(this, datum, ws));
        ws.on('close', (msg) => {
            onWSClose.call(this, ws);
        });
        this._roles = roles;
        this._friendly = friendly;
        this.name = name;
        this.emit('ws', ws);
    }
    close() {
        this._peer._addressMap.forEach((unit, key) => {
            unit === this && this._peer._addressMap.delete(key);
        });
        this._sockets.forEach((ws) => ws.close(constants_1.WS_MANUAL_CLOSE_CODE, 'intentionaly closed'));
    }
}
exports.Unit = Unit;
function onWSClose(ws) {
    for (let i = 0; i < this._sockets.length; i++) {
        if (this._sockets[i] === ws) {
            this._sockets.splice(i, 1);
            break;
        }
    }
    this._sockets.length < 1 && this.emit('close');
}
function sendViaAny(unit, datum, cb) {
    if (unit._sockets.length < 1) {
        cb && cb('Missing underlying sockets to send data');
    }
    let arr = unit._sockets;
    trySendViaAny(arr, datum, cb);
}
function trySendViaAny(arr, datum, cb) {
    let trying = false;
    for (let i = 0; i < arr.length; i++) {
        if (arr[i].readyState === 1) {
            arr[i].send(datum, { binary: true }, (err) => {
                if (err) {
                    if (i < arr.length - 1) {
                        let left = Array.prototype.slice(i);
                        trying = true;
                        trySendViaAny(left, datum, cb);
                    }
                    else {
                        cb && cb('All underlying sockets rejected data to be written out');
                    }
                }
                else {
                    cb && cb(null, arr[i]);
                }
            });
            return;
        }
    }
    trying || (cb && cb(new Error('No open sockets left')));
}
function sendRequest(params, data, cb, type = constants_1.TYPE_REQ) {
    let cbid = this._cbid++;
    let datum = protocolConversions_1.serializeRequest(type, params.role, params.event, cbid, data);
    sendViaAny(this, datum, (err) => {
        if (err) {
            cb(err, { unit: this, data: null });
        }
        else {
            this._cb.set(cbid, cb);
            let exp = params.timeout || this._peer._requestTimeout || constants_1.DEFAULT_REQUEST_TIMEOUT;
            let reqTimeout = setTimeout(() => {
                receiveResponse_1.receiveResponse.call(this, cbid, new Error(`Request timeout exceeded (${exp} ms)`));
            }, exp);
            this._timeouts.set(cbid, reqTimeout);
            this._onCloseHandlers.add(cbid);
        }
    });
}
function sendRequestForStream(params, data, type, ctr, cb) {
    let cbid = this._cbid++;
    let datum = protocolConversions_1.serializeStreamRequest(type, params.role, params.event, cbid, ctr, data);
    sendViaAny(this, datum, (err) => {
        if (err) {
            cb(err, { unit: this, data: null });
        }
        else {
            this._cb.set(cbid, cb);
            let exp = params.timeout || this._peer._requestTimeout || constants_1.DEFAULT_REQUEST_TIMEOUT;
            let reqTimeout = setTimeout(() => {
                receiveResponse_1.receiveResponse.call(this, cbid, new Error(`Request timeout exceeded (${exp} ms)`));
            }, exp);
            this._timeouts.set(cbid, reqTimeout);
            this._onCloseHandlers.add(cbid);
        }
    });
}
function handlePayload(datum, ws) {
    switch (datum[0]) {
        case constants_1.TYPE_MSG: {
            let ctx = protocolConversions_1.parseSingle(datum);
            handleMessage.call(this, ctx);
            break;
        }
        case constants_1.TYPE_REQ: {
            let ctx = protocolConversions_1.parseRequest(datum);
            handleRequest.call(this, ctx);
            break;
        }
        case constants_1.TYPE_RES: {
            let ctx = protocolConversions_1.parseResponse(datum);
            receiveResponse_1.receiveResponse.call(this, ctx._correlation, null, ctx, ws);
            break;
        }
        case constants_1.TYPE_REJECT: {
            let ctx = protocolConversions_1.parseResponse(datum);
            receiveResponse_1.receiveResponse.call(this, ctx._correlation, ctx.data, ctx, ws);
            break;
        }
        case constants_1.TYPE_STREAM_RESOLVE: {
            let ctx = protocolConversions_1.parseStreamResponse(datum);
            receiveResponse_1.receiveResponse.call(this, ctx._correlation, null, ctx, ws);
            break;
        }
        case constants_1.TYPE_STREAM_REJECT: {
            let ctx = protocolConversions_1.parseStreamResponse(datum);
            receiveResponse_1.receiveResponse.call(this, ctx._correlation, ctx.data, ctx, ws);
            break;
        }
        case constants_1.TYPE_ACQUAINT: {
            let parsed = JSON.parse(protocolConversions_1.parseString(datum));
            handleAcquaintMessage.call(this, parsed);
            break;
        }
        case constants_1.TYPE_ROLES: {
            let str = protocolConversions_1.parseString(datum);
            let roles = JSON.parse(str);
            handleUnitRoles.call(this, roles);
            break;
        }
        case constants_1.TYPE_REQ4WRITABLE: {
            let ctx = protocolConversions_1.parseStreamRequest(datum);
            handleRequestForReadableStream.call(this, ctx);
            break;
        }
        case constants_1.TYPE_REQ4READABLE: {
            let ctx = protocolConversions_1.parseStreamRequest(datum);
            handleRequestForWritableStream.call(this, ctx);
            break;
        }
        case constants_1.TYPE_STREAM_MSG: {
            let cbLength = datum[1];
            let cbBuffer = datum.slice(2, 2 + cbLength);
            let scb = cbBuffer.toString('hex');
            let type = datum[2 + cbLength];
            let chunk = datum.slice(3 + cbLength);
            this._streamReceiverEE.emit(scb, type, chunk);
            break;
        }
        default:
            this.emit('error', new Error(`unknown message type ${datum[0]}. Make sure unit ${this.id} implements the protocol correctly`));
    }
}
function handleRequest(ctx) {
    let cb = createResponder(this, ctx._correlation);
    if (!this._peer._roles.has(ctx.role)) {
        return cb(`The role "${ctx.role}" is not registered`);
    }
    let peerRole = this._peer._roles.get(ctx.role);
    if (!peerRole.active) {
        return cb(`The role "${ctx.role}" is disabled`);
    }
    if (!peerRole._reqHandler.eventNames().includes(ctx.event)) {
        return cb(`The event "${ctx.event}" is not handled`);
    }
    ctx.unit = this;
    peerRole._emitReq(ctx, cb);
}
function handleMessage(ctx) {
    ctx.unit = this;
    this._peer._roles.has(ctx.role) && this._peer._roles.get(ctx.role)._emitMsg(ctx);
}
function createHeartBeat(ws) {
    ws.on('ping', function () {
        ws.readyState === 1 && ws.pong();
    });
    let interval = setInterval(() => {
        let active = false;
        let timeout = setTimeout(() => {
            setImmediate(() => {
                if (!active) {
                    ws.readyState === 1 && ws.close(constants_1.WS_HEARTBEAT_TIMEOUT_CLOSE_CODE, 'PING TIMEOUT');
                }
            });
        }, constants_1.HEARTBEAT_TIMEOUT);
        ws.once('pong', () => {
            active = true;
            clearTimeout(timeout);
        });
        if (ws.readyState === 1) {
            ws.ping();
        }
        timeout.unref();
    }, constants_1.HEARTBEAT_INTERVAL);
    ws.once('close', () => clearInterval(interval));
    interval.unref();
}
function handleUnitRoles(rolesMsg) {
    if (this._lastRolesUpdate >= rolesMsg.i) {
        return;
    }
    this._roles = rolesMsg.roles;
    this._lastRolesUpdate = rolesMsg.i;
    Peer_1.refreshPeerDestinations.call(this._peer, this);
    this.emit('_new_roles', rolesMsg);
}
function handleAcquaintMessage({ id, address, roles }) {
    if (!this._peer.friendly)
        return;
    for (let peer of this._peer.units.values()) {
        if (peer.id === id)
            return;
    }
    for (let dest of this._peer.destinations.values()) {
        if (roles.includes(dest.name)) {
            return this._peer.connect(address, undefined, () => { });
        }
    }
}
function handleRequestForReadableStream(ctx) {
    let { event, role, _ctr } = ctx;
    const cb = createStreamResponder(this, ctx._correlation);
    if (typeof _ctr !== 'number') {
        cb('Internal error: typeof bpid should be number. Got ' + typeof _ctr);
    }
    if (!this._peer._roles.has(role)) {
        return cb(`The role "${role}" is not registered`);
    }
    let peerRole = this._peer._roles.get(role);
    if (!peerRole.active) {
        return cb(`The role "${role}" is disabled`);
    }
    if (!peerRole._readableHandler.eventNames().includes(event)) {
        return cb(`The event "${event}" is not handled`);
    }
    let sid = getFreeCallbackIDForEE_1.getFreeCallbackIDForEE(this._streamReceiverEE);
    let readable = new ReadableOverWS_1.ReadableOverWS({
        receiver: this._streamReceiverEE,
    });
    readable._setSID(sid);
    readable._setBPID(_ctr);
    let handled = false;
    let callback = (err, data) => {
        if (handled)
            return;
        handled = true;
        if (err) {
            cb(err);
        }
        else {
            cb(null, sid, data, (err, ws) => {
                if (err) {
                    readable.destroy(new Error(`Error when writing response to underlying socket`));
                }
                else {
                    readable._bindWS(ws);
                    readable.emit('ready', { unit: this });
                }
            });
        }
    };
    ctx.unit = this;
    ctx.readable = readable;
    peerRole._emitReadable(ctx, callback);
}
function handleRequestForWritableStream(ctx) {
    let { role, event, _ctr } = ctx;
    const cb = createStreamResponder(this, ctx._correlation);
    if (!this._peer._roles.has(role)) {
        return cb(`The role "${role}" is not registered`);
    }
    let peerRole = this._peer._roles.get(role);
    if (!peerRole.active) {
        return cb(`The role "${role}" is disabled`);
    }
    if (!peerRole._writableHandler.eventNames().includes(event)) {
        return cb(`The event "${event}" is not handled`);
    }
    if (typeof _ctr !== 'number') {
        cb('Internal error: typeof sid should be number. Got ' + typeof _ctr);
    }
    let handled = false;
    let bpid = getFreeCallbackIDForEE_1.getFreeCallbackIDForEE(this._streamReceiverEE);
    let receiver = this._streamReceiverEE;
    let writable = new WritableOverWS_1.WritableOverWS({
        receiver,
    });
    writable._setSID(_ctr);
    writable._setBPID(bpid);
    let callback = (err, data) => {
        if (handled)
            return;
        handled = true;
        if (err) {
            cb(err);
        }
        else {
            cb(null, bpid, data, (err, ws) => {
                if (err) {
                    writable.destroy(new Error(`Error eccured when writing response to underlying socket: ${err.toString()}`));
                }
                else {
                    writable._bindWS(ws);
                    writable.emit('ready', { unit: this });
                }
            });
        }
    };
    ctx.unit = this;
    ctx.writable = writable;
    peerRole._emitWritable(ctx, callback);
}
function openReadableStream(headers, data = {}, options = {}) {
    let sid = getFreeCallbackIDForEE_1.getFreeCallbackIDForEE(this._streamReceiverEE);
    let receiver = this._streamReceiverEE;
    let readable = new ReadableOverWS_1.ReadableOverWS(Object.assign({}, options, { receiver }));
    readable._setSID(sid);
    sendRequestForStream.call(this, headers, data, constants_1.TYPE_REQ4READABLE, sid, (err, ctx, ws) => {
        if (err) {
            readable.destroy(new Error(`Unit rejected request for readable stream: ${err}`));
        }
        else {
            readable._setBPID(ctx._ctr);
            readable._bindWS(ws);
            readable.emit('ready', ctx);
        }
    });
    return readable;
}
function openWritableStream(headers, data = {}, options = {}) {
    let receiver = this._streamReceiverEE;
    let bpid = getFreeCallbackIDForEE_1.getFreeCallbackIDForEE(receiver);
    let writable = new WritableOverWS_1.WritableOverWS(Object.assign({}, options, { receiver }));
    writable._setBPID(bpid);
    sendRequestForStream.call(this, headers, data, constants_1.TYPE_REQ4WRITABLE, bpid, (err, ctx, ws) => {
        if (err) {
            writable.destroy(new Error(`Unit rejected request for writable stream: ${err}`));
        }
        else {
            writable._setSID(ctx._ctr);
            writable._bindWS(ws);
            writable.emit('ready', ctx);
        }
    });
    return writable;
}
function createResponder(unit, cbid) {
    let responded = false;
    return (err, res, cb) => {
        if (responded) {
            return cb && cb(new Error('already responded'));
        }
        ;
        responded = true;
        let datum;
        if (err) {
            datum = protocolConversions_1.serializeResponse(constants_1.TYPE_REJECT, cbid, JSON.stringify({ data: err.toString ? err.toString() : err }));
            sendViaAny(unit, datum, cb ? cb : undefined);
        }
        else {
            let datum = protocolConversions_1.serializeResponse(constants_1.TYPE_RES, cbid, res);
            sendViaAny(unit, datum, cb ? cb : undefined);
        }
    };
}
function createStreamResponder(unit, cbid) {
    let responded = false;
    return (err, ctr, res, cb) => {
        if (responded) {
            return cb && cb(new Error('already responded'));
        }
        ;
        responded = true;
        let datum;
        if (err) {
            datum = protocolConversions_1.serializeStreamResponse(constants_1.TYPE_STREAM_REJECT, cbid, ctr, JSON.stringify({ data: err.toString ? err.toString() : err }));
            sendViaAny(unit, datum, cb ? cb : undefined);
        }
        else {
            let datum = protocolConversions_1.serializeStreamResponse(constants_1.TYPE_STREAM_RESOLVE, cbid, ctr, res);
            sendViaAny(unit, datum, cb ? cb : undefined);
        }
    };
}
//# sourceMappingURL=Unit.js.map