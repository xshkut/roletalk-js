import { EventEmitter } from 'events';
import { Peer } from './Peer';
import { ROLES_MESSAGE } from './constants';
import { Context, ContextForReadable, ContextForWritable, RequestCallback, MessageHandler, RequestHandler, ReadableHandler, WritableHandler } from './interfaces';

/**Role represents a service on the local Peer. It should handle incoming messages, requests and stream requests for certain functionality
 * 
 * This class should not be instantiated directly. It is exposed for type declaration and documentation
*/
export class Role extends EventEmitter {
    /**@internal */
    _msgHandler: EventEmitter = new EventEmitter();
    /**@internal */
    _reqHandler: EventEmitter = new EventEmitter();
    /**@internal */
    _readableHandler: EventEmitter = new EventEmitter();
    /**@internal */
    _writableHandler: EventEmitter = new EventEmitter();
    /**@internal */
    _peer: Peer;
    /**@internal */
    _active: boolean;
    readonly name: string;
    constructor(name: string, peer: Peer, active?: boolean) {
        super();
        if (!name || typeof name !== 'string') {
            throw new Error(`Role's name should be a string`);
        }
        this._peer = peer;
        this.name = name;
        if (active === false) {
            this._active = false;
        } else {
            this._active = true;
        }
    }

	/**
     * Set handler for incoming message
     */
    onMessage(msg: string | MessageHandler, handler?: MessageHandler) {
        if (typeof msg === 'string') {
            return this._msgHandler.on(msg, handler!);
        }
        this.on('message', msg);
    }
	/**
     * Set handler for incoming request.
	 */
    onRequest(msg: string | RequestHandler, handler?: RequestHandler) {
        if (typeof msg === 'string') {
            return this._reqHandler.on(msg, handler!);
        }
        this.on('request', msg)
    }
	/**
	* Set handler for incoming request for receiving stream data
     */
    onReadable(msg: string, handler: ReadableHandler) {
        if (typeof msg === 'string') {
            return this._readableHandler.on(msg, handler);
        }
        this.on('readable', msg)
    }
	/**
	* Set handler for incoming request for sending stream data
     */
    onWritable(msg: string | WritableHandler, handler?: WritableHandler) {
        if (typeof msg === 'string') {
            return this._writableHandler.on(msg, handler!)
        }
        this.on('writable', msg)
    }
    onData(handler: MessageHandler | RequestHandler | WritableHandler | ReadableHandler) {
        this.on('data', handler)
    }
	/**
	 * Deactivate role. All units will be notified immediately
	 */
    disable() {
        this._active = false;
        this._peer.emit(ROLES_MESSAGE, this);
    }
	/**
	 * Activate role. All units will be notified immediately
	 */
    enable() {
        this._active = true;
        this._peer.emit(ROLES_MESSAGE, this);
    }
	/**
	 * get role status
	 */
    get active() {
        return this._active;
    }
    /**@internal */
    _emitMsg(ctx: Context) {
        runMiddleware(this, this._msgHandler, 'message', ctx);
    }
    /**@internal */
    _emitReq(ctx: Context, cb: RequestCallback) {
        runMiddleware(this, this._reqHandler, 'request', ctx, cb);
    }
    /**@internal */
    _emitReadable(ctx: ContextForReadable, cb: RequestCallback) {
        runMiddleware(this, this._readableHandler, 'readable', ctx, cb);
    }
    /**@internal */
    _emitWritable(ctx: ContextForWritable, cb: RequestCallback) {
        runMiddleware(this, this._writableHandler, 'writable', ctx, cb);
    }
}

function runMiddleware(role: Role, handler: EventEmitter, communicationType: string, ctx: Context | ContextForReadable | ContextForWritable, callback?: RequestCallback) {
    let cb;
    let done = false;
    let resolvers: (() => void)[] = []
    if (callback) {
        ctx.next = () => {
            let bndResolve: (() => void)
            let prom = new Promise<void>(resolve => {
                bndResolve = resolve;
                resolvers.push(() => resolve);
            })
            resolvers.push(bndResolve!.bind(prom));
            return prom
        };
        cb = (err: any, res: any) => {
            done = true;
            ctx.response = res;
            ctx.error = err;
            chainResolvers(resolvers, () => {
                callback!(ctx.error, ctx.response);
            });
        }
    }
    role._peer.emit('data', ctx, cb);
    done || role._peer.emit(communicationType, ctx, cb);
    done || role.emit('data', ctx, cb);
    done || role.emit(communicationType, ctx, cb);
    done || handler.emit(ctx.event!, ctx, cb)
}

function chainResolvers(resolvers: (() => void)[], final: Function) {
    setImmediate(() => {
        if (resolvers.length === 0) {
            return final();
        }
        resolvers.pop()!();
        chainResolvers(resolvers, final);
    })
}
