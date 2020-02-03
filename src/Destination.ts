import { SetWithRoundRobin } from './misc/SetWithRoundRobin';
import { Unit } from './Unit';
import { EventEmitter } from 'events';
import { MessageHeaders, EmitOptions, Context, sendableData } from './interfaces';
import { Readable, Writable, ReadableOptions, WritableOptions } from 'stream';
import { Peer } from './Peer';

/**Destination represents a role (a service name) of remote peers (units). Destination is used as a gateway for outgoing communication. It implements round-robin load balancing between units 
 * 
 * This class should not be instantiated directly. It is exposed for type declaration and documentation
*/
export class Destination extends EventEmitter {
    private _name: string;
    private _ready: boolean = false;
    private _peer: Peer;
    /**@internal */
    _set: SetWithRoundRobin<Unit>;

    constructor(name: string, peer: Peer) {
        super();
        this._name = name;
        this._peer = peer;
        this._set = new SetWithRoundRobin();
    }

    /**Array of connected [[Unit]]s */
    get units() {
        return Array.from(this._set.values());
    }

    /**Name of destination */
    get name() { return this._name }

    /**Send one-way message. Use cb argument to ensure the message has benn written to underlying socket. Returns [[Unit]] chosen to send data to */
    send(event: string | EmitOptions, data: sendableData, cb?: (err: Error) => {}) {
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
            unit.send(headers, data, cb);
            return unit;
        } else {
            return undefined;
        }
    }

    /**Send one-way message to all units serving the role*/
    broadcast(event: string | EmitOptions, data: sendableData) {
        let headers = createMessageHeaders.call(this, event);
        this._set.forEach((unit) => {
            unit.send(headers, data);
        });
    }

    /**Send request. If cb argument is not provided, returns Promise<[[Context]]>
     * If there are not connected [[Unit]]s serving corresponding [[Role]], method will throw synchronous error. To ensure at least one unit is connected, use [[Destination.ready]]
    */
    request(event: string | EmitOptions, data: sendableData, cb?: (err: Error | null, ctx: Context) => void): Promise<Context> {
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

    /**Send requests to each unit of the role. Callback cb will be applied to each request 
     * If there are not connected [[Unit]]s serving corresponding [[Role]], method will throw synchronous error. To ensure at least one unit is connected, use [[Destination.ready]]
    */
    survey(event: string | EmitOptions, data: sendableData, cb: (err: Error | null, ctx: Context) => void) {
        let headers = createMessageHeaders.call(this, event);
        if (this._set.size < 1) new Error(`No connected units with role [${this.name}]`);
        this._set.forEach(unit => unit.request(headers, data, cb));
        return this._set.size;
    }

    /**Send request to establish binary stream session. This end of the stream is readable (receives data only)
     * If chosen [[Unit]] will reject the request, [[Writable]] will emit "error" event
     * If there are not connected [[Unit]]s serving corresponding [[Role]], method will throw synchronous error. To ensure at least one unit is connected, use [[Destination.ready]]
    */
    Readable(event: string | EmitOptions, data: sendableData, options?: ReadableOptions): Readable {
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

    /**Send request to establish binary stream session. This end of the stream is writable (forwards data only)
     * If chosen [[Unit]] will reject the request, [[Writable]] will emit "error" event
     * If there are not connected [[Unit]]s serving corresponding [[Role]], method will throw synchronous error. To ensure at least one unit is connected, use [[Destination.ready]]
    */
    Writable(event: string | EmitOptions, data: sendableData, options?: WritableOptions): Writable {
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

    /**@internal */
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

    /**@internal */
    _deleteUnit(unit: Unit) {
        if (!this._set.has(unit)) return;
        this._set.delete(unit);
        if (this._set.size < 1) {
            this._ready = false;
            this.emit('close');
        }
    }

    /**Returns true if there is at least one [[Unit]] serving corresponding [[Role]] */
    get ready() {
        return this._ready;
    }
}

export interface Destination {
    /**@internal */
    on(event: string, handler?: (...args: any[]) => void): this

    /**Not tested yet. Event 'close' is dispatched when last unit gets disconnected
     * @event
     */
    on(event: 'close', handler: () => void): this

    /**Event 'unit' is dispatched when destination gets new unit connected
     */
    on(event: 'unit', handler: (unit: Unit) => void): this
}


function createMessageHeaders(this: Destination, event: string | EmitOptions): MessageHeaders {
    let headers = typeof event === 'object' && event ? { ...event } : { event } as MessageHeaders;
    headers.role = this.name;
    return headers;
}


