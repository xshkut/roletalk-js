import { Peer } from './Peer';
import WebSocket from 'ws';
export declare class Auth {
    _keys: Map<string, string>;
    _peer: Peer;
    constructor(peer: Peer);
    addPresharedKey(id: string, key: string): void;
    _verifyWS(ws: WebSocket, cb: (err?: any, res?: any) => void): void;
}
//# sourceMappingURL=Auth.d.ts.map