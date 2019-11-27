"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const https_1 = __importDefault(require("https"));
const crypto_1 = __importDefault(require("crypto"));
const ws_1 = __importDefault(require("ws"));
const events_1 = __importDefault(require("events"));
const Unit_1 = require("./Unit");
const Destination_1 = require("./Destination");
const Role_1 = require("./Role");
const Auth_1 = require("./Auth");
const constants_js_1 = require("./constants.js");
const receiveResponse_1 = require("./misc/receiveResponse");
const reconnectIntervals = [0, 1, 2, 3, 4, 5, 10, 30, 60];
class Peer extends events_1.default {
    constructor(options = {}) {
        super();
        this._units = new Map();
        this._destinations = new Map();
        this._roles = new Map();
        this._addressMap = new Map();
        this._lastRolesUpdate = 0;
        this.id = crypto_1.default.randomBytes(16).toString('hex');
        this.name = '';
        this._requestTimeout = constants_js_1.DEFAULT_REQUEST_TIMEOUT;
        this.auth = new Auth_1.Auth(this);
        this.friendly = options.friendly === false ? false : true;
        this._constructed = Date.now();
        if (typeof options.name === 'string') {
            this.name = options.name;
        }
        let sendingNewRoles = false;
        const sendNewRoles = () => {
            !sendingNewRoles &&
                setImmediate(() => {
                    sendingNewRoles = false;
                    this._lastRolesUpdate++;
                    this.units.forEach((unit) => {
                        unit._sendRoles();
                    });
                });
            sendingNewRoles = true;
        };
        this.on('role', sendNewRoles);
        this.on(constants_js_1.ROLES_MESSAGE, sendNewRoles.bind(this));
    }
    listen(options, cb) {
        if (this._listener)
            throw new Error('.listen has been called already');
        if (typeof options === 'number') {
            this._server = http_1.default.createServer();
            this._port = options;
        }
        else if (typeof options === 'object') {
            if (typeof options.port !== 'number') {
                throw new Error('Provide options.port');
            }
            this._path = options.path;
            this._port = options.port;
            if (options.server) {
                if (options.server instanceof http_1.default.Server) {
                    this._server = options.server;
                }
                else {
                    throw new Error('options.server should be http.Server instance');
                }
            }
            else if (options.ssl) {
                let ssl = {};
                if (options.ssl === true) {
                    ssl.cert = constants_js_1.PUBLICKEY;
                    ssl.key = constants_js_1.PRIVATEKEY;
                }
                else if (options.ssl.cert && options.ssl.key) {
                    ssl = options.ssl;
                }
                else {
                    throw new Error('Provide correct options.ssl');
                }
                this._server = https_1.default.createServer(Object.assign({}, ssl));
            }
            else {
                this._server = http_1.default.createServer();
            }
        }
        else {
            throw new Error('Incorrect type of arguments');
        }
        if (!cb) {
            return new Promise((res, rej) => _listen.call(this, (err) => (err ? rej(err) : res(this))));
        }
        else if (typeof cb !== 'function') {
            throw new Error('Argument should be a function (if provided)');
        }
        return _listen.call(this, cb);
    }
    close(cb = () => { }) {
        if (typeof cb !== 'function') {
            throw new Error('Argument should be a function (if provided)');
        }
        this._units.forEach((unit) => unit.close());
        return this._server && this._server.close(cb);
    }
    connect(address, options, cb) {
        if (typeof address !== 'string') {
            throw new Error('address should be a string');
        }
        if (typeof options === 'function') {
            cb = options;
            options = {};
        }
        if (typeof cb !== 'function') {
            cb = undefined;
        }
        options = options || {};
        options.rejectUnauthorized = options.rejectUnauthorized || false;
        options.permanent = options.permanent || true;
        if (options.permanent === true) {
            this._addressMap.set(address, null);
            if (cb) {
                startReconnectCycle(this, address, options, 0, cb);
                return undefined;
            }
            return new Promise((resolve, reject) => startReconnectCycle(this, address, options, 0, ((err, res) => {
                err ? reject(err) : resolve(res);
            })));
        }
        if (cb) {
            _connect.call(this, address, options, cb);
            return undefined;
        }
        return new Promise((resolve, reject) => _connect.call(this, address, options, (err, res) => {
            err ? reject(err) : resolve(res);
        }));
    }
    destination(name) {
        if (!this._destinations.has(name)) {
            let destination = new Destination_1.Destination(name, this);
            this._units.forEach((unit) => {
                unit.getRoles().includes(name) && destination._addUnit(unit);
            });
            this._destinations.set(name, destination);
        }
        return this._destinations.get(name);
    }
    role(name, active) {
        if (!this._roles.has(name)) {
            this._roles.set(name, new Role_1.Role(name, this, active));
            this.emit('role', this._roles.get(name).name);
        }
        return this._roles.get(name);
    }
    get units() {
        return Array.from(this._units.values());
    }
    get roles() {
        return Array.from(this._roles.values());
    }
    get destinations() {
        return Array.from(this._destinations.values());
    }
    onMessage(handler) {
        this.on('message', handler);
    }
    onRequest(handler) {
        this.on('request', handler);
    }
    onReadable(handler) {
        this.on('readable', handler);
    }
    onWritable(handler) {
        this.on('writable', handler);
    }
    onData(handler) {
        this.on('data', handler);
    }
}
exports.Peer = Peer;
function _connect(address, options, cb) {
    if (cb) {
        makeWS.call(this, address, undefined, options, cb);
        return null;
    }
    return new Promise((resolve, reject) => makeWS.call(this, address, undefined, options, (err, res) => {
        err ? reject(err) : resolve(res);
    }));
}
function _listen(cb) {
    let server = this._server;
    let peer = this;
    this._wss = new ws_1.default.Server({
        server,
        path: this._path
    });
    this._wss.on('connection', function (ws) {
        peer.auth._verifyWS(ws, (err, data) => {
            if (err) {
                return ws.close(constants_js_1.WS_AUTH_ERROR_CLOSE);
            }
            UnitFromWS.call(peer, ws, data);
        });
    });
    this._wss.on('error', function () { });
    let listener = server.listen(this._port, (err) => {
        if (err) {
            this._listener = undefined;
            return cb(err);
        }
        this._port = listener.address().port;
        cb(null);
    });
    this._listener = listener;
}
function makeWS(address, protocol, options, cb) {
    let peer = this;
    let ws = new ws_1.default(address, protocol, options);
    const onClose = () => {
        ws.removeEventListener('error', onError);
        cb('Socket closed');
    };
    const onError = (err) => {
        ws.removeEventListener('close', onClose);
        cb('Socket errored: ' + err);
    };
    ws.once('close', onClose);
    ws.once('error', onError);
    ws.once('open', () => {
        peer.auth._verifyWS(ws, (err, data) => {
            ws.removeEventListener('close', onClose);
            if (err) {
                cb(err);
                ws.close();
            }
            ws.removeEventListener('error', onError);
            if (err)
                return;
            try {
                let unit = UnitFromWS.call(peer, ws, data, address);
                cb(null, { unit, ws });
            }
            catch (err) {
                cb(new Error('Error when creating a unit after successfull authentication: ' + err.toString ? err.toString() : err));
            }
        });
    });
}
function UnitFromWS(ws, data, address) {
    let { id, roles, name, friendly } = data;
    let exists = this._units.has(id);
    if (!exists) {
        this._units.set(id, new Unit_1.Unit({
            id,
            name,
            friendly,
            peer: this,
            meta: data.meta,
            roles
        }));
    }
    let unit = this._units.get(id);
    unit._bindWS(ws, data);
    refreshPeerDestinations.call(this, unit);
    acquaintConnectedPeer.call(this, id, roles, address);
    if (exists)
        return unit;
    this.emit('unit', unit);
    unit.once('close', () => {
        this._destinations.forEach(destination => destination._deleteUnit(unit));
        this._units.delete(unit.id);
        unit._onCloseHandlers.forEach(cbid => {
            receiveResponse_1.receiveResponse.call(unit, cbid, new Error(`All unit's sockets have been closed`));
        });
    });
    return unit;
}
function acquaintConnectedPeer(id, roles, address) {
    if (roles.length > 1) {
        acquaintOthersWithUnit.call(this, id, roles, address);
    }
    acquaintUnitWithOthers.call(this, id);
}
function acquaintOthersWithUnit(id, roles, address) {
    this._units.forEach((unit) => {
        if (unit.id === id || !unit._friendly)
            return;
        unit._acquaint({
            address,
            id,
            roles
        });
    });
}
function acquaintUnitWithOthers(id) {
    let new_unit = this._units.get(id);
    if (!new_unit._friendly)
        return;
    Array.from(this._addressMap.entries()).forEach(([address, unit]) => {
        if (!unit || unit.id === id)
            return;
        if (new_unit._friendly === true) {
            new_unit._acquaint({
                id: unit.id,
                address,
                roles: unit._roles
            });
        }
    });
}
function refreshPeerDestinations(unit) {
    let unitRoles = unit.getRoles();
    this._destinations.forEach((destination) => {
        if (!unitRoles.includes(destination.name)) {
            destination._deleteUnit(unit);
        }
    });
    unitRoles.forEach(role => {
        this._destinations.has(role) && this._destinations.get(role)._addUnit(unit);
    });
}
exports.refreshPeerDestinations = refreshPeerDestinations;
function startReconnectCycle(peer, address, options, i = 0, cb) {
    let addressMap = peer._addressMap;
    if (!addressMap.has(address))
        return;
    _connect.call(peer, address, { permanent: true }).then(({ unit, ws }) => {
        addressMap.set(address, unit);
        ws.once('close', () => {
            addressMap.has(address) && addressMap.set(address, null);
            startReconnectCycle(peer, address, options);
        });
        cb && cb(null, { unit, ws });
        i > 0 && peer.emit(constants_js_1.PEER_RECONNECT_SUCCESS_EVENT, { address, count: i });
    }).catch((err) => {
        i > 0 && peer.emit(constants_js_1.PEER_RECONNECT_FAIL_EVENT, { address, count: i, error: err });
        let time = reconnectIntervals[Math.min(i++, reconnectIntervals.length - 1)] * 1000;
        setTimeout(() => {
            startReconnectCycle(peer, address, options, i);
        }, time).unref();
        cb && cb(err);
    });
}
//# sourceMappingURL=Peer.js.map