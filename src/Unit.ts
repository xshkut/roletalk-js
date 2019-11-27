import { Readable, ReadableOptions, WritableOptions, Writable } from 'stream';
import EventEmitter from 'events';
import WebSocket from 'ws';
import { MessageHeaders, InitialUnitData, AcquaintMessage, WebSocketBindData, SendableData, ContextData, ContextDataForReadable, InitialStreamContextData, StreamContextData, PeerMetaData, rolesMsg } from './interfaces';
import { ReadableOverWS } from './misc/ReadableOverWS';
import { WritableOverWS } from './misc/WritableOverWS';
import { getFreeCallbackIDForEE } from './misc/getFreeCallbackIDForEE';
import {
	HEARTBEAT_INTERVAL, HEARTBEAT_TIMEOUT, DEFAULT_REQUEST_TIMEOUT, TYPE_REQ4READABLE, TYPE_MSG, TYPE_REQ, TYPE_RES,
	TYPE_REJECT, TYPE_ACQUAINT, TYPE_ROLES, TYPE_REQ4WRITABLE, TYPE_STREAM_MSG, WS_HEARTBEAT_TIMEOUT_CLOSE_CODE, WS_MANUAL_CLOSE_CODE, TYPE_STREAM_REJECT, TYPE_STREAM_RESOLVE
} from './constants';
import { Peer, refreshPeerDestinations } from './Peer';
import { serializeSingle, parseSingle, parseRequest, parseResponse, serializeResponse, serializeStreamRequest, parseStreamRequest, serializeRequest, serializeStreamResponse, parseStreamResponse, parseString, serializeString } from './misc/protocolConversions';
import { receiveResponse } from './misc/receiveResponse';

export class Unit extends EventEmitter {
	readonly id: string;
	name: string | undefined = undefined;
	_peer: Peer;
	_friendly: boolean;
	_sockets: WebSocket[] = [];
	_roles: string[] = [];
	_reqHandler = new EventEmitter();
	_readableHandler = new EventEmitter();
	_writableHandler = new EventEmitter();
	_streamReceiverEE = new EventEmitter();
	_cb: Map<number, Function> = new Map();
	_cbid = 0;
	_timeouts: Map<number, NodeJS.Timeout> = new Map();
	_onCloseHandlers: Set<number> = new Set();
	_metaData: PeerMetaData
	_lastRolesUpdate: number = 0
	constructor ({ peer, id, friendly, name, roles, meta }: InitialUnitData) {
		super();
		this.id = id;
		this.name = name;
		this._peer = peer;
		this._friendly = friendly
		this._roles = roles;
		this._metaData = meta;
		this.once('error', err => {
			this.close();
		})
	}
	getRoles() {
		return this._roles;
	}
	get meta() {
		return this._metaData
	}
	send(params: MessageHeaders, data: any, cb?: Function) {
		let datum = serializeSingle(TYPE_MSG, params.role, params.event, data);
		sendViaAny(this, datum, cb);
	}
	_sendRoles() {
		let msg: rolesMsg = { i: this._peer._lastRolesUpdate, roles: this._peer.roles.filter(role => role.active).map(role => role.name) }
		let data = JSON.stringify(msg);
		let datum = serializeString(TYPE_ROLES, data);
		sendViaAny(this, datum);
	}
	request(params: MessageHeaders, data: any, cb?: (err: Error | null, ctx: ContextData) => void): Promise<any> {
		if (cb) {
			sendRequest.call(this, params, data, cb);
		} else {
			return new Promise((resolve, reject) =>
				sendRequest.call(this, params, data, (err: Error | null, res: ContextData) => (err ? reject(err) : resolve(res)))
			);
		}
		return (<unknown>null) as Promise<any>;
	}

	Writable(headers: MessageHeaders, data?: SendableData, options?: any): Writable {
		return openWritableStream.call(this, headers, data, options);
	}

	Readable(headers: MessageHeaders, data?: any, options?: any, cb?: Function): Readable {
		if (typeof data === 'function') {
			cb = data;
			data = undefined;
		} else if (typeof options === 'function') {
			cb = options;
			options = undefined;
		}
		return openReadableStream.call(this, headers, data, options);
	}

	_acquaint(payload: AcquaintMessage) {
		let data = JSON.stringify(payload);
		let datum = serializeString(TYPE_ACQUAINT, data);
		sendViaAny(this, datum);
	}

	_bindWS(ws: WebSocket, { roles, friendly, name }: WebSocketBindData) {
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
		this._sockets.forEach((ws: WebSocket) => ws.close(WS_MANUAL_CLOSE_CODE, 'intentionaly closed'));
	}
}

function onWSClose(this: Unit, ws: WebSocket) {
	for (let i = 0; i < this._sockets.length; i++) {
		if (this._sockets[i] === ws) {
			this._sockets.splice(i, 1);
			break;
		}
	}
	this._sockets.length < 1 && this.emit('close');
}

function sendViaAny(unit: Unit, datum: any, cb?: Function) {
	if (unit._sockets.length < 1) {
		cb && cb('Missing underlying sockets to send data');
	}
	let arr = unit._sockets;
	trySendViaAny(arr, datum, cb);
}

function trySendViaAny(arr: WebSocket[], datum: any, cb?: Function) {
	let trying = false;
	for (let i = 0; i < arr.length; i++) {
		if (arr[i].readyState === 1) {
			arr[i].send(datum, { binary: true }, (err) => {
				if (err) {
					if (i < arr.length - 1) {
						let left = Array.prototype.slice(i);
						trying = true;
						trySendViaAny(left, datum, cb);
					} else {
						cb && cb('All underlying sockets rejected data to be written out');
					}
				} else {
					cb && cb(null, arr[i]);
				}
			});
			return;
		}
	}
	trying || (cb && cb(new Error('No open sockets left')));
}

function sendRequest(this: Unit, params: MessageHeaders, data: any, cb: (err: Error | null, ctx: ContextData) => void, type = TYPE_REQ) {
	let cbid = this._cbid++;
	let datum = serializeRequest(type, params.role, params.event, cbid, data);
	sendViaAny(this, datum, (err: any) => {
		if (err) {
			cb(err, { unit: this, data: null } as ContextData);
		} else {
			this._cb.set(cbid, cb);
			let exp = params.timeout || this._peer._requestTimeout || DEFAULT_REQUEST_TIMEOUT;
			let reqTimeout = setTimeout(() => {
				receiveResponse.call(this, cbid, new Error(`Request timeout exceeded (${exp} ms)`));
			}, exp);
			this._timeouts.set(cbid, reqTimeout);
			this._onCloseHandlers.add(cbid);
		}
	});
}

function sendRequestForStream(this: Unit, params: MessageHeaders, data: any, type: number, ctr: number, cb: (err: Error | null, ctx: InitialStreamContextData) => void) {
	let cbid = this._cbid++;
	let datum = serializeStreamRequest(type, params.role, params.event, cbid, ctr, data);
	sendViaAny(this, datum, (err: any) => {
		if (err) {
			cb(err, { unit: this, data: null } as any);
		} else {
			this._cb.set(cbid, cb);
			let exp = params.timeout || this._peer._requestTimeout || DEFAULT_REQUEST_TIMEOUT;
			let reqTimeout = setTimeout(() => {
				receiveResponse.call(this, cbid, new Error(`Request timeout exceeded (${exp} ms)`));
			}, exp);
			this._timeouts.set(cbid, reqTimeout);
			this._onCloseHandlers.add(cbid);
		}
	});
}

function handlePayload(this: Unit, datum: any, ws: WebSocket) {
	switch (datum[0]) {
		case TYPE_MSG: {
			let ctx = parseSingle(datum);
			handleMessage.call(this, ctx);
			break;
		}
		case TYPE_REQ: {
			let ctx = parseRequest(datum);
			handleRequest.call(this, ctx);
			break;
		}
		case TYPE_RES: {
			let ctx = parseResponse(datum);
			receiveResponse.call(this, ctx._correlation!, null, ctx, ws);
			break;
		}
		case TYPE_REJECT: {
			let ctx = parseResponse(datum);
			receiveResponse.call(this, ctx._correlation!, ctx.data, ctx, ws);
			break;
		}
		case TYPE_STREAM_RESOLVE: {
			let ctx = parseStreamResponse(datum);
			receiveResponse.call(this, ctx._correlation!, null, ctx, ws);
			break;
		}
		case TYPE_STREAM_REJECT: {
			let ctx = parseStreamResponse(datum);
			receiveResponse.call(this, ctx._correlation!, ctx.data, ctx, ws);
			break;
		}
		case TYPE_ACQUAINT: {
			let parsed = JSON.parse(parseString(datum));
			handleAcquaintMessage.call(this, parsed);
			break;
		}
		case TYPE_ROLES: {
			let str = parseString(datum);
			let roles = JSON.parse(str);
			handleUnitRoles.call(this, roles)
			break;
		}
		case TYPE_REQ4WRITABLE: {
			let ctx = parseStreamRequest(datum);
			handleRequestForReadableStream.call(this, ctx);
			break;
		}
		case TYPE_REQ4READABLE: {
			let ctx = parseStreamRequest(datum);
			handleRequestForWritableStream.call(this, ctx);
			break;
		}
		case TYPE_STREAM_MSG: {
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

function handleRequest(this: Unit, ctx: ContextData) {
	let cb = createResponder(this, ctx._correlation!);
	if (!this._peer._roles.has(ctx.role!)) {
		return cb(`The role "${ctx.role!}" is not registered`);
	}
	let peerRole = this._peer._roles.get(ctx.role!)!;
	if (!peerRole.active) {
		return cb(`The role "${ctx.role}" is disabled`);
	}
	if (!peerRole._reqHandler.eventNames().includes(ctx.event!)) {
		return cb(`The event "${ctx.event}" is not handled`);
	}
	(<ContextData>ctx).unit = this;
	peerRole._emitReq(<ContextData>ctx, cb);
}

function handleMessage(this: Unit, ctx: ContextData) {
	(ctx as ContextData).unit = this;
	this._peer._roles.has(ctx.role!) && this._peer._roles.get(ctx.role!)!._emitMsg(<ContextData>ctx);
}

function createHeartBeat(ws: WebSocket) {
	ws.on('ping', function () {
		ws.readyState === 1 && ws.pong()
	})
	let interval = setInterval(() => {
		let active = false;
		let timeout = setTimeout(() => {
			setImmediate(() => {
				if (!active) {
					ws.readyState === 1 && ws.close(WS_HEARTBEAT_TIMEOUT_CLOSE_CODE, 'PING TIMEOUT');
				}
			});
		}, HEARTBEAT_TIMEOUT);
		ws.once('pong', () => {
			active = true;
			clearTimeout(timeout);
		});
		if (ws.readyState === 1) {
			ws.ping();
		}
		timeout.unref();
	}, HEARTBEAT_INTERVAL);
	ws.once('close', () => clearInterval(interval));
	interval.unref();
}

function handleUnitRoles(this: Unit, rolesMsg: rolesMsg) {
	if (this._lastRolesUpdate >= rolesMsg.i) {
		return
	}
	this._roles = rolesMsg.roles;
	this._lastRolesUpdate=rolesMsg.i
	refreshPeerDestinations.call(this._peer, this);
	this.emit('_new_roles', rolesMsg);
}

function handleAcquaintMessage(this: Unit, { id, address, roles }: AcquaintMessage) {
	if (!this._peer.friendly) return;
	for (let peer of this._peer.units.values()) {
		if (peer.id === id) return
	}
	for (let dest of this._peer.destinations.values()) {
		if (roles.includes(dest.name)) {
			return this._peer.connect(address, undefined, () => { });
		}
	}
}

function handleRequestForReadableStream(
	this: Unit, ctx: StreamContextData
) {
	let { event, role, _ctr } = ctx;
	const cb = createStreamResponder(this, ctx._correlation!);
	if (typeof _ctr !== 'number') {
		cb('Internal error: typeof bpid should be number. Got ' + typeof _ctr);
	}
	if (!this._peer._roles.has(role!)) {
		return cb(`The role "${role}" is not registered`);
	}
	let peerRole = this._peer._roles.get(role!)!;
	if (!peerRole.active) {
		return cb(`The role "${role}" is disabled`);
	}
	if (!peerRole._readableHandler.eventNames().includes(event!)) {
		return cb(`The event "${event}" is not handled`);
	}
	let sid = getFreeCallbackIDForEE(this._streamReceiverEE);
	let readable = new ReadableOverWS({
		receiver: this._streamReceiverEE,
	});
	readable._setSID(sid);
	readable._setBPID(_ctr);
	let handled = false;
	let callback = (err: any, data: any) => {
		if (handled) return;
		handled = true;
		if (err) {
			cb(err);
		} else {
			cb(null, sid, data, (err: any, ws: WebSocket) => {
				if (err) {
					readable.destroy(new Error(`Error when writing response to underlying socket`));
				} else {
					readable._bindWS(ws);
					readable.emit('ready', { unit: this });
				}
			});
		}
	};
	ctx.unit = this;
	(ctx as ContextDataForReadable).readable = readable;
	peerRole._emitReadable(<ContextDataForReadable>ctx, callback);
}

function handleRequestForWritableStream(
	this: Unit, ctx: StreamContextData
) {
	let { role, event, _ctr } = ctx;
	const cb = createStreamResponder(this, ctx._correlation!);
	if (!this._peer._roles.has(role!)) {
		return cb(`The role "${role}" is not registered`);
	}
	let peerRole = this._peer._roles.get(role!)!;
	if (!peerRole.active) {
		return cb(`The role "${role}" is disabled`);
	}
	if (!peerRole._writableHandler.eventNames().includes(event!)) {
		return cb(`The event "${event}" is not handled`);
	}
	if (typeof _ctr !== 'number') {
		cb('Internal error: typeof sid should be number. Got ' + typeof _ctr);
	}
	let handled = false;
	let bpid = getFreeCallbackIDForEE(this._streamReceiverEE);
	let receiver = this._streamReceiverEE;
	let writable = new WritableOverWS({
		receiver,
	});
	writable._setSID(_ctr);
	writable._setBPID(bpid);
	let callback = (err: any, data: SendableData) => {
		if (handled) return;
		handled = true;
		if (err) {
			cb(err);
		} else {
			cb(null, bpid, data, (err: any, ws: WebSocket) => {
				if (err) {
					writable.destroy(new Error(`Error eccured when writing response to underlying socket: ${err.toString()}`));
				} else {
					writable._bindWS(ws);
					writable.emit('ready', { unit: this });
				}
			});
		}
	};
	(ctx as any).unit = this;
	(ctx as any).writable = writable;
	peerRole._emitWritable(<any>ctx, callback);
}

function openReadableStream(
	this: Unit,
	headers: MessageHeaders,
	data = {},
	options: ReadableOptions = {}
) {
	let sid = getFreeCallbackIDForEE(this._streamReceiverEE);
	let receiver = this._streamReceiverEE;
	let readable = new ReadableOverWS({
		...options,
		receiver
	});
	readable._setSID(sid);
	sendRequestForStream.call(this,
		headers,
		data, TYPE_REQ4READABLE, sid,
		(err: any, ctx: InitialStreamContextData, ws?: WebSocket) => {
			if (err) {
				readable.destroy(new Error(`Unit rejected request for readable stream: ${err}`));
			} else {
				readable._setBPID(ctx._ctr);
				readable._bindWS(ws!);
				readable.emit('ready', ctx);
			}
		},

	);
	return readable
}

function openWritableStream(
	this: Unit,
	headers: MessageHeaders,
	data: SendableData = {},
	options: WritableOptions = {},
) {
	let receiver = this._streamReceiverEE;
	let bpid = getFreeCallbackIDForEE(receiver);
	let writable = new WritableOverWS({
		...options,
		receiver
	});
	writable._setBPID(bpid);
	sendRequestForStream.call(this, headers, data, TYPE_REQ4WRITABLE, bpid,
		(err: any, ctx: InitialStreamContextData, ws?: WebSocket) => {
			if (err) {
				writable.destroy(new Error(`Unit rejected request for writable stream: ${err}`));
			} else {
				writable._setSID(ctx._ctr);
				writable._bindWS(ws!);
				writable.emit('ready', ctx);
			}
		}
	);
	return writable;
}

function createResponder(unit: Unit, cbid: number) {
	let responded = false;
	return (err: any, res?: any, cb?: Function) => {
		if (responded) {
			return cb && cb(new Error('already responded'));
		};
		responded = true;
		let datum: Buffer;
		if (err) {
			datum = serializeResponse(TYPE_REJECT, cbid, JSON.stringify({ data: err.toString ? err.toString() : err }));
			sendViaAny(unit, datum, cb ? cb : undefined);
		} else {
			let datum = serializeResponse(TYPE_RES, cbid, res);
			sendViaAny(unit, datum, cb ? cb : undefined);
		}
	};
}

function createStreamResponder(unit: Unit, cbid: number) {
	let responded = false;
	return (err: any, ctr?: number, res?: any, cb?: Function) => {
		if (responded) {
			return cb && cb(new Error('already responded'));
		};
		responded = true;
		let datum: Buffer;
		if (err) {
			datum = serializeStreamResponse(TYPE_STREAM_REJECT, cbid, ctr!, JSON.stringify({ data: err.toString ? err.toString() : err }));
			sendViaAny(unit, datum, cb ? cb : undefined);
		} else {
			let datum = serializeStreamResponse(TYPE_STREAM_RESOLVE, cbid, ctr!, res);
			sendViaAny(unit, datum, cb ? cb : undefined);
		}
	};
}

// function sendRejection(unit: Unit, cbid: number, data: any, cb?: Function) {
// 	let datum = serializeResponse(TYPE_REJECT, cbid, JSON.stringify({ data: data.toString ? data.toString() : data }));
// 	sendViaAny(unit, datum, cb ? cb : undefined);
// }

// function sendResponse(unit: Unit, cbid: number, data: any, cb?: Function) {
// 	let datum = serializeResponse(TYPE_RES, cbid, data);
// 	sendViaAny(unit, datum, cb ? cb : undefined);
// }
