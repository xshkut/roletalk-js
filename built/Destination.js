"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SetWithRoundRobin_1 = require("./misc/SetWithRoundRobin");
const events_1 = require("events");
class Destination extends events_1.EventEmitter {
    constructor(name, peer) {
        super();
        this._ready = false;
        this._name = name;
        this._peer = peer;
        this._set = new SetWithRoundRobin_1.SetWithRoundRobin();
    }
    get units() {
        return Array.from(this._set.values());
    }
    get name() { return this._name; }
    send(event, data) {
        let headers;
        let unit;
        if (typeof event === 'object' && event) {
            headers = event;
            if (event.unit) {
                unit = this._set.has(this._peer._units.get(event.unit.id)) ? event.unit : undefined;
            }
            else {
                unit = this._set.nextValue();
            }
        }
        else {
            headers = { event };
            unit = this._set.nextValue();
        }
        headers.role = this.name;
        if (unit) {
            unit.send(headers, data);
            return unit;
        }
        else {
            return undefined;
        }
    }
    broadcast(event, data) {
        let headers = createMessageHeaders.call(this, event);
        this._set.forEach((unit) => {
            unit.send(headers, data);
        });
    }
    request(event, data, cb) {
        let headers;
        let unit;
        if (typeof event === 'object' && event) {
            headers = event;
            if (event.unit) {
                unit = this._peer.units.includes(this._peer._units.get(event.unit.id)) ? event.unit : undefined;
            }
            else {
                unit = this._set.nextValue();
            }
        }
        else {
            headers = { event };
            unit = this._set.nextValue();
        }
        headers.role = this.name;
        if (!unit)
            throw new Error(`No connected units with role [${this.name}]`);
        return unit.request(headers, data, cb);
    }
    survey(event, data, cb) {
        let headers = createMessageHeaders.call(this, event);
        if (this._set.size < 1)
            new Error(`No connected units with role [${this.name}]`);
        this._set.forEach(unit => unit.request(headers, data, cb));
        return this._set.size;
    }
    Readable(event, data, options) {
        let headers;
        let unit;
        if (typeof event === 'object' && event) {
            headers = event;
            if (event.unit) {
                unit = this._peer.units.includes(this._peer._units.get(event.unit.id)) ? event.unit : undefined;
            }
            else {
                unit = this._set.nextValue();
            }
        }
        else {
            headers = { event };
            unit = this._set.nextValue();
        }
        headers.role = this.name;
        if (!unit)
            throw new Error(`No connected units with role [${this.name}]`);
        return unit.Readable(headers, data, options);
    }
    Writable(event, data, options, cb) {
        let headers;
        let unit;
        if (typeof event === 'object' && event) {
            headers = event;
            if (event.unit) {
                unit = this._peer.units.includes(this._peer._units.get(event.unit.id)) ? event.unit : undefined;
            }
            else {
                unit = this._set.nextValue();
            }
        }
        else {
            headers = { event };
            unit = this._set.nextValue();
        }
        headers.role = this.name;
        if (!unit)
            throw new Error(`No connected units with role [${this.name}]`);
        return unit.Writable(headers, data, options);
    }
    _addUnit(unit) {
        if (this._set.has(unit))
            return;
        this._set.add(unit);
        let wasReady = this.ready;
        this._ready = true;
        if (!wasReady) {
            this.emit('open');
        }
        this.emit('unit', unit);
    }
    _deleteUnit(unit) {
        if (!this._set.has(unit))
            return;
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
exports.Destination = Destination;
function createMessageHeaders(event) {
    let headers = typeof event === 'object' && event ? Object.assign({}, event) : { event };
    headers.role = this.name;
    return headers;
}
//# sourceMappingURL=Destination.js.map