"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = __importDefault(require("events"));
const constants_1 = require("./constants");
class Role extends events_1.default {
    constructor(name, peer, active) {
        super();
        this._msgHandler = new events_1.default();
        this._reqHandler = new events_1.default();
        this._readableHandler = new events_1.default();
        this._writableHandler = new events_1.default();
        if (!name || typeof name !== 'string') {
            throw new Error(`Role's name should be a string`);
        }
        this._peer = peer;
        this.name = name;
        if (active === false) {
            this._active = false;
        }
        else {
            this._active = true;
        }
    }
    onMessage(msg, handler) {
        if (typeof msg === 'string') {
            return this._msgHandler.on(msg, handler);
        }
        this.on('message', msg);
    }
    onRequest(msg, handler) {
        if (typeof msg === 'string') {
            return this._reqHandler.on(msg, handler);
        }
        this.on('request', msg);
    }
    onReadable(msg, handler) {
        if (typeof msg === 'string') {
            return this._readableHandler.on(msg, handler);
        }
        this.on('readable', msg);
    }
    onWritable(msg, handler) {
        if (typeof msg === 'string') {
            return this._writableHandler.on(msg, handler);
        }
        this.on('writable', msg);
    }
    onData(handler) {
        this.on('data', handler);
    }
    disable() {
        this._active = false;
        this._peer.emit(constants_1.ROLES_MESSAGE, this);
    }
    enable() {
        this._active = true;
        this._peer.emit(constants_1.ROLES_MESSAGE, this);
    }
    get active() {
        return this._active;
    }
    _emitMsg(ctx) {
        runMiddleware(this, this._msgHandler, 'message', ctx);
    }
    _emitReq(ctx, cb) {
        runMiddleware(this, this._reqHandler, 'request', ctx, cb);
    }
    _emitReadable(ctx, cb) {
        runMiddleware(this, this._readableHandler, 'readable', ctx, cb);
    }
    _emitWritable(ctx, cb) {
        runMiddleware(this, this._writableHandler, 'writable', ctx, cb);
    }
}
exports.Role = Role;
function runMiddleware(role, handler, communicationType, ctx, callback) {
    let cb;
    let done = false;
    let resolvers = [];
    if (callback) {
        ctx.next = () => {
            let bndResolve;
            let prom = new Promise(resolve => {
                bndResolve = resolve;
                resolvers.push(() => resolve);
            });
            resolvers.push(bndResolve.bind(prom));
            return prom;
        };
        cb = (err, res) => {
            done = true;
            ctx.response = res;
            ctx.error = err;
            chainResolvers(resolvers, () => {
                callback(ctx.error, ctx.response);
            });
        };
    }
    role._peer.emit('data', ctx, cb);
    done || role._peer.emit(communicationType, ctx, cb);
    done || role.emit('data', ctx, cb);
    done || role.emit(communicationType, ctx, cb);
    done || handler.emit(ctx.event, ctx, cb);
}
function chainResolvers(resolvers, final) {
    setImmediate(() => {
        if (resolvers.length === 0) {
            return final();
        }
        resolvers.pop()();
        chainResolvers(resolvers, final);
    });
}
//# sourceMappingURL=Role.js.map