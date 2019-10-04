import { SetWithRoundRobin } from './misc/SetWithRoundRobin';
import { Unit } from './Unit';
import { EventEmitter } from 'events';
import { MessageHeaders, MessageOptions, ContextData, SendableData, MessageData as MessageContext } from './interfaces';
import { Readable, Writable, ReadableOptions, WritableOptions } from 'stream';
import { Peer } from './Peer';

// type MiddlewareFunction = (ctx: MessageContext, cb?: Function) => any

export class Destination extends EventEmitter {
	private _name: string;
	private _ready: boolean = false;
	_set: SetWithRoundRobin<Unit>;
	// _mw: MiddlewareFunction[] = [];
	private _peer: Peer;
	constructor (name: string, peer: Peer) {
		super();
		this._name = name;
		this._peer = peer;
		this._set = new SetWithRoundRobin();
	}
	get units() {
		return Array.from(this._set.values());
	}
	get name() { return this._name }
	send(event: string | MessageOptions, data: SendableData) {
		let headers: MessageHeaders;
		let unit: Unit | undefined;
		if (typeof event === 'object' && event) {
			headers = event;
			if (event.unit) {
				unit = this._set.has(this._peer._units.get(event.unit.id)!) ? event.unit : undefined;
			} else {
				unit = this._set.nextValue();
			}
		} else {
			headers = { event }
			unit = this._set.nextValue();
		}
		headers.role = this.name;
		if (unit) {
			unit.send(headers, data);
			return unit;
		} else {
			return undefined;
		}
	}
	broadcast(event: string | MessageHeaders, data: SendableData) {
		let headers = createMessageHeaders.call(this, event);
		this._set.forEach((unit) => {
			unit.send(headers, data);
		});
	}
	request(event: string | MessageOptions, data: SendableData, cb?: (err: Error | null, ctx: ContextData) => void): Promise<any> {
		let headers: MessageHeaders;
		let unit: Unit | undefined;
		if (typeof event === 'object' && event) {
			headers = event;
			if (event.unit) {
				unit = this._peer.units.includes(this._peer._units.get(event.unit.id)!) ? event.unit : undefined;
			} else {
				unit = this._set.nextValue();
			}
		} else {
			headers = { event }
			unit = this._set.nextValue();
		}
		headers.role = this.name;
		if (!unit) throw new Error(`No connected units with role [${this.name}]`);
		return unit.request(headers, data, cb);
	}
	survey(event: string | MessageHeaders, data: SendableData, cb: (err: Error | null, ctx: ContextData) => void) {
		let headers = createMessageHeaders.call(this, event);
		if (this._set.size < 1) new Error(`No connected units with role [${this.name}]`);
		this._set.forEach(unit => unit.request(headers, data, cb));
		return this._set.size;
	}
	Readable(event: string | MessageOptions, data: SendableData, options?: ReadableOptions): Readable {
		let headers: MessageHeaders;
		let unit: Unit | undefined;
		if (typeof event === 'object' && event) {
			headers = event;
			if (event.unit) {
				unit = this._peer.units.includes(this._peer._units.get(event.unit.id)!) ? event.unit : undefined;
			} else {
				unit = this._set.nextValue();
			}
		} else {
			headers = { event }
			unit = this._set.nextValue();
		}
		headers.role = this.name;
		if (!unit) throw new Error(`No connected units with role [${this.name}]`);
		return unit.Readable(headers, data, options);
	}
	Writable(event: string | MessageOptions, data: SendableData, options?: WritableOptions, cb?: Function): Writable {
		let headers: MessageHeaders;
		let unit: Unit | undefined;
		if (typeof event === 'object' && event) {
			headers = event;
			if (event.unit) {
				unit = this._peer.units.includes(this._peer._units.get(event.unit.id)!) ? event.unit : undefined;
			} else {
				unit = this._set.nextValue();
			}
		} else {
			headers = { event }
			unit = this._set.nextValue();
		}
		headers.role = this.name;
		if (!unit) throw new Error(`No connected units with role [${this.name}]`);
		return unit.Writable(headers, data, options);
	}
	_addUnit(unit: Unit) {
		if (this._set.has(unit)) return;
		this._set.add(unit);
		let wasReady = this.ready;
		this._ready = true;
		if (!wasReady) {
			this.emit('open');
		}
		this.emit('unit', unit);
	}
	_deleteUnit(unit: Unit) {
		if (!this._set.has(unit)) return;
		this._set.delete(unit);
		if (this._set.size < 1) {
			this._ready = false;
			this.emit('close');
		}
	}
	get ready() {
		return this._ready;
	}
}

function createMessageHeaders(this: Destination, event: string | MessageOptions): MessageHeaders {
	let headers = typeof event === 'object' && event ? { ...event } : { event } as MessageHeaders;
	headers.role = this.name;
	return headers;
}


