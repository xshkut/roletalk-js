import * as http from "http";
import * as https from "https";
import * as crypto from "crypto";
import * as WebSocket from "ws";
import { EventEmitter } from "events";
import { Unit } from "./Unit";
import { Destination } from "./Destination";
import { Role } from "./Role";
import { Auth } from "./Auth";
import {
  DEFAULT_REQUEST_TIMEOUT,
  ROLES_MESSAGE as ROLES_CHANGE,
  WS_AUTH_ERROR_CLOSE,
} from "./constants";
import { SecureContextOptions } from "tls";
import {
  PeerOptions,
  ListenOptions,
  ConnectOptions,
  WritableHandler,
  ReadableHandler,
  RequestHandler,
  MessageHandler,
  PeerConfirmData,
} from "./interfaces";
import { receiveResponse } from "./misc/receiveResponse";
import type { Socket } from "net";

const reconnectIntervals = [0, 1, 2, 3, 4, 5, 10, 30, 60];

/**
 * Peer is the main class of Roletalk framework. Peer can be instantiated with counstructor. You can also use [[Singleton]] to retrieve a peer instance shared with other modules.
 */
export class Peer extends EventEmitter {
  /**@internal */
  auth: Auth;
  name: string;
  friendly: boolean;
  /**@internal */
  readonly _id: string;
  /**@internal */
  _units: Map<string, Unit> = new Map();
  /**@internal */
  _destinations: Map<string, Destination> = new Map();
  /**@internal */
  _roles: Map<string, Role> = new Map();
  /**@internal */
  _requestTimeout: number;
  /**@internal */
  _addressMap: Map<string, Unit | null> = new Map();
  /**@internal */
  _server?: http.Server | https.Server;
  /**@internal */
  _port?: number;
  /**@internal */
  _host?: string;
  /**@internal */
  _wss?: WebSocket.Server;
  /**@internal */
  _path?: string;
  /**@internal */
  _listener?: http.Server | https.Server;
  /**@internal */
  _constructed: number;
  /**@internal */
  _lastRolesUpdate: number = 0;
  /**@internal */
  _static_tags = new Map<string, string>();

  constructor(options: PeerOptions = {}) {
    super();
    this._id = crypto.randomBytes(16).toString("hex");
    this.name = "";
    this._requestTimeout = DEFAULT_REQUEST_TIMEOUT;
    this.auth = new Auth(this);
    this.friendly = options.friendly === false ? false : true;
    this._constructed = Date.now();
    if (typeof options.name === "string") {
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
    this.on("role", sendNewRoles);
    this.on(ROLES_CHANGE, sendNewRoles.bind(this));
  }
  /**Get peer's unique identifier. It is generated when Peer is being instantiated */
  get id() {
    return this._id;
  }
  /**Add secret key bound to id. After a key is added, this peer will not be authenticated with any other peer unless some common id:key pair is equal */
  addPresharedKey(id: string, key: string): this {
    this.auth.addPresharedKey(id, key);
    return this;
  }

  /**Add static key-value tags to the Peer instance. The tags will be available on remote peers. New tags will not be delivered to already connected peers*/
  setTag(key: string, value: string) {
    if (typeof key !== "string" || typeof value !== "string") {
      throw new Error(`Provide string arguments`);
    }

    this._static_tags.set(key, value);
  }

  /**Retrieve Peer's static key-value tags as { [key:string]: string }*/
  getTags(): { [key: string]: string } {
    const tags = Array.from(this._static_tags.entries()).reduce(
      (obj, entry) => ({ ...obj, [entry[0]]: entry[1] }),
      {}
    );
    return tags;
  }

  /**Instantiate websocket server. Use with .handleUpgrade */
  prepareWSServer() {
    this._wss = new WebSocket.Server({
      noServer: true,
    });
    this._wss.on("connection", (ws: WebSocket) => {
      this.auth._verifyWS(ws, (err, data) => {
        if (err) {
          return ws.close(WS_AUTH_ERROR_CLOSE);
        }
        UnitFromWS.call(this, ws, data);
      });
    });
    this._wss.on("error", function () {});
  }

  /**Attach to existing http.Server instance
   *
   * Example:
   * peer.prepareWSServer()
   * server.on("upgrade", (request, socket, head) => {
   *  peer.handleUpgrade(request, socket, head)
   * })
   *
   */
  handleUpgrade(
    request: http.IncomingMessage,
    socket: Socket,
    upgradeHead: Buffer
  ): void {
    if (!this._wss) {
      throw new Error(
        `Cannot handle upgrade: instantiate websocket server (use .prepareWSServer or .listen)`
      );
    }

    this._wss.handleUpgrade(request, socket, upgradeHead, (ws, request) => {
      this._wss!.emit("connection", ws, request);
    });
  }

  /**Listen to incoming connections. Starts HTTP(S) server listening immediately.*/
  listen(
    this: Peer,
    options: ListenOptions | number,
    cb?: Function
  ): Promise<Peer> {
    if (this._listener) throw new Error(".listen has been called already");
    if (typeof options === "number") {
      this._server = http.createServer();
      this._port = options;
    } else if (typeof options === "object") {
      if (typeof options.port !== "number") {
        throw new Error("Provide options.port");
      }
      this._path = options.path;
      this._port = options.port;
      this._host = options.host;
      if (options.server) {
        this._server = options.server;
      } else if (options.ssl) {
        let ssl: SecureContextOptions = {};
        if (options.ssl.cert && options.ssl.key) {
          ssl = options.ssl;
        } else {
          throw new Error("Provide correct options.ssl");
        }
        this._server = https.createServer({
          ...ssl,
        });
      } else {
        this._server = http.createServer();
      }
    } else {
      throw new Error("Incorrect type of arguments");
    }
    if (!cb) {
      return new Promise((res, rej) =>
        _listen.call(this, (err: any) => (err ? rej(err) : res(this)))
      );
    } else if (typeof cb !== "function") {
      throw new Error("Argument should be a function (if provided)");
    }
    return (_listen.call(this, cb) as unknown) as Promise<Peer>;
  }
  /**Close all incoming connections and stop listening http server. Provide optional cb argument to run callback when internal server stops listening */
  close(cb?: (err?: Error) => void) {
    if (cb && typeof cb !== "function") {
      throw new Error("Argument should be a function (if provided)");
    }
    this._units.forEach((unit) => unit.close());
    return this._server && this._server.close(cb);
  }
  /**Connect to another peer using WebSocket. Options can be used to override [[WebSocket.ClientOptions]].
   * Set options.permanent = false if connection is not supposed to reconnect after abort
   */
  connect(
    address: string,
    options?: WebSocket.ClientOptions & ConnectOptions,
    cb?: (err?: Error, res?: { unit: Unit; ws: WebSocket }) => void
  ): Promise<{ unit: Unit; ws: WebSocket }> {
    if (typeof address !== "string") {
      throw new Error("address should be a string");
    }
    if (typeof options === "function") {
      cb = <(err: any, res: any) => void>(<unknown>options);
      options = {} as WebSocket.ClientOptions;
    }
    if (typeof cb !== "function") {
      cb = undefined;
    }
    options = options || {};
    options.rejectUnauthorized = options.rejectUnauthorized || false;
    options.permanent = options.permanent || true;
    if (options.permanent === true) {
      this._addressMap.set(address, null);
      // options && this._connOptsMap.set(address, options);
      if (cb) {
        startReconnectCycle(this, address, options, 0, cb);
        return (undefined as unknown) as Promise<{ unit: Unit; ws: WebSocket }>;
      }
      return new Promise((resolve, reject) =>
        startReconnectCycle(
          this,
          address,
          options,
          0,
          (err?: any, res?: any) => {
            err ? reject(err) : resolve(res);
          }
        )
      );
    }
    if (cb) {
      _connect.call(this, address, options, cb);
      return (undefined as unknown) as Promise<{ unit: Unit; ws: WebSocket }>;
    }
    return new Promise((resolve, reject) =>
      _connect.call(this, address, options, (err?: any, res?: any) => {
        err ? reject(err) : resolve(res);
      })
    );
  }
  /**
   * Destination is remote peer's role
   * @param {string} name target name
   * @return {Target} class destination
   */
  destination(name: string): Destination {
    if (!this._destinations.has(name)) {
      let destination = new Destination(name, this);
      this._units.forEach((unit: Unit) => {
        unit.getRoles().includes(name) && destination._addUnit(unit);
      });
      this._destinations.set(name, destination);
    }
    return <Destination>this._destinations.get(name);
  }
  /**Declare [[Role]] - service with its own name to handle incoming messages/requests/streams */
  role(name: string, active?: boolean): Role {
    if (!this._roles.has(name)) {
      this._roles.set(name, new Role(name, this, active));
      this.emit("role", this._roles.get(name));
    }
    return this._roles.get(name)!;
  }
  /**Returns list of connected [[Unit]]s */
  get units() {
    return Array.from(this._units.values());
  }
  /**Returns list of declared [[Role]]s */
  get roles() {
    return Array.from(this._roles.values());
  }
  /**Returns list of declared [[Destination]]s. If some units have declared roles out of this [[Peer]]'s destinations, they are not listed here */
  get destinations() {
    return Array.from(this._destinations.values());
  }
  /**Set handler to all incoming messages for all roles. Can be used in middleware */
  onMessage(handler: MessageHandler) {
    this.on("message", handler);
  }
  /**
   * Set handler for all incoming request for all roles. Can be used in middlewares
   */
  onRequest(handler: RequestHandler) {
    this.on("request", handler);
  }
  /**
   * Set middleware for incoming request for receiving stream data for all roles
   */
  onReadable(handler: ReadableHandler) {
    this.on("readable", handler);
  }
  /**
   * Set middleware for incoming request for sending stream data for all roles
   */
  onWritable(handler: WritableHandler) {
    this.on("writable", handler);
  }
  /**
   * Set middleware for incoming messages, requests and streams for all roles
   */
  onData(
    handler: MessageHandler | RequestHandler | WritableHandler | ReadableHandler
  ) {
    this.on("data", handler);
  }
}

function _connect(
  this: Peer,
  address: string,
  options?: WebSocket.ClientOptions & ConnectOptions,
  cb?: (err?: Error, res?: { unit: Unit; ws: WebSocket }) => void
) {
  if (cb) {
    makeWS.call(this, address, undefined, options, cb);
    return null;
  }
  return new Promise<{ unit: Unit; ws: WebSocket }>((resolve, reject) =>
    makeWS.call(this, address, undefined, options, (err?: any, res?: any) => {
      err ? reject(err) : resolve(res);
    })
  );
}

function _listen(this: Peer, cb: Function) {
  let server = this._server as http.Server | https.Server;
  let peer = this;
  this._wss = new WebSocket.Server({
    server,
    path: this._path,
  });
  this._wss.on("connection", function (ws: WebSocket) {
    peer.auth._verifyWS(ws, (err, data) => {
      if (err) {
        return ws.close(WS_AUTH_ERROR_CLOSE);
      }
      UnitFromWS.call(peer, ws, data);
    });
  });
  this._wss.on("error", function () {});

  let responded = false;

  let listener = server.listen({ port: this._port, host: this._host }, () => {
    if (responded) return;
    responded = true;

    this._port = (listener.address() as { port: number }).port;
    cb(null);
  });

  server.once("error", (err) => {
    if (responded) return;
    responded = true;

    this._listener = undefined;
    cb(err);
  });

  this._listener = listener;
}

function makeWS(
  this: Peer,
  address: string,
  protocol: string | string[] | undefined,
  options: WebSocket.ClientOptions | undefined,
  cb: (err: any, res?: { unit: Unit; ws: WebSocket }) => void
) {
  let peer = this;
  let ws = new WebSocket(address, protocol, options);
  const onClose = () => {
    ws.removeEventListener("error", onError);
    cb("Socket closed");
  };
  const onError = (err: any) => {
    ws.removeEventListener("close", onClose);
    cb("Socket errored: " + err);
  };
  ws.once("close", onClose);
  ws.once("error", onError);
  ws.once("open", () => {
    peer.auth._verifyWS(ws, (err, data) => {
      ws.removeEventListener("close", onClose);
      if (err) {
        cb(err);
        ws.close();
      }
      ws.removeEventListener("error", onError);
      if (err) return;
      try {
        let unit = UnitFromWS.call(peer, ws, data, address);
        cb(null, { unit, ws });
      } catch (err) {
        cb(
          new Error(
            "Error when creating a unit after successfull authentication: " +
            err.toString
              ? err.toString()
              : err
          )
        );
      }
    });
  });
}

function UnitFromWS(
  this: Peer,
  ws: WebSocket,
  data: PeerConfirmData,
  address?: string
): Unit {
  let { id, roles, name, friendly, tags } = data;
  let exists = this._units.has(id);
  if (!exists) {
    this._units.set(
      id,
      new Unit({
        id,
        name,
        friendly,
        peer: this,
        meta: data.meta,
        roles,
        tags: tags,
      })
    );
  }
  let unit = this._units.get(id)!;
  unit._bindWS(ws, data);
  refreshPeerDestinations.call(this, unit);
  acquaintConnectedPeer.call(this, id, roles, address!);
  if (exists) return unit;
  this.emit("unit", unit);
  unit.once("close", () => {
    this._destinations.forEach((destination) => destination._deleteUnit(unit));
    this._units.delete(unit.id);
    unit._onCloseHandlers.forEach((cbid) => {
      receiveResponse.call(
        unit,
        cbid,
        new Error(`All unit's sockets have been closed`)
      );
    });
  });
  return unit;
}

export interface Peer {
  /**@internal */
  on(event: string, handler?: (...args: any[]) => void): this;

  /**Not tested yet. Event 'close' is dispatched when last connection gets closed and server stops listening
   * @event
   */
  on(event: "close", handler: () => void): this;

  /**Event 'unit' is dispatched when peer gets connected to a unit
   */
  on(event: "unit", handler: (unit: Unit) => void): this;

  /**Event 'role' is dispatched when new role is registered
   * @event
   */
  on(event: "role", handler: (role: Role) => void): this;
}

function acquaintConnectedPeer(
  this: Peer,
  id: string,
  roles: string[],
  address: string
) {
  if (roles.length > 1) {
    acquaintOthersWithUnit.call(this, id, roles, address);
  }
  acquaintUnitWithOthers.call(this, id);
}

function acquaintOthersWithUnit(
  this: Peer,
  id: string,
  roles: string[],
  address: string
) {
  this._units.forEach((unit) => {
    if (unit.id === id || !unit._friendly) return;
    unit._acquaint({
      address,
      id,
      roles,
    });
  });
}

function acquaintUnitWithOthers(this: Peer, id: string) {
  let new_unit = this._units.get(id) as Unit;
  if (!new_unit._friendly) return;
  Array.from(this._addressMap.entries()).forEach(([address, unit]) => {
    if (!unit || unit.id === id) return;
    if (new_unit._friendly === true) {
      new_unit._acquaint({
        id: unit.id,
        address,
        roles: unit._roles,
      });
    }
  });
}

/**@internal */
export function refreshPeerDestinations(this: Peer, unit: Unit) {
  let unitRoles = unit.getRoles();
  this._destinations.forEach((destination) => {
    if (!unitRoles.includes(destination.name)) {
      destination._deleteUnit(unit);
    }
  });
  unitRoles.forEach((role) => {
    this._destinations.has(role) &&
      this._destinations.get(role)!._addUnit(unit);
  });
}

function startReconnectCycle(
  peer: Peer,
  address: string,
  options?: WebSocket.ClientOptions,
  i = 0,
  cb?: Function
) {
  let addressMap = peer._addressMap;
  if (!addressMap.has(address)) return;
  _connect
    .call(peer, address, { ...options, permanent: true })!
    .then(({ unit, ws }) => {
      addressMap.set(address, unit);
      ws.once("close", () => {
        addressMap.has(address) && addressMap.set(address, null);
        startReconnectCycle(peer, address, options);
      });
      cb && cb(null, { unit, ws });
      i > 0 && peer.emit(PEER_RECONNECT_SUCCESS_EVENT, { address, count: i });
    })
    .catch((err: Error) => {
      i > 0 &&
        peer.emit(PEER_RECONNECT_FAIL_EVENT, { address, count: i, error: err });
      let time =
        reconnectIntervals[Math.min(i++, reconnectIntervals.length - 1)] * 1000;
      setTimeout(() => {
        startReconnectCycle(peer, address, options, i);
      }, time).unref();
      cb && cb(err);
    });
}

//public events
/**@internal */
export const PEER_RECONNECT_SUCCESS_EVENT = "reconnect_success";
/**@internal */
export const PEER_RECONNECT_FAIL_EVENT = "reconnect_fail";
