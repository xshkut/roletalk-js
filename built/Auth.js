"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = require("crypto");
const constants_js_1 = require("./constants.js");
class Auth {
    constructor(peer) {
        this._keys = new Map();
        this._peer = peer;
    }
    ;
    addPresharedKey(id, key) {
        if (typeof id !== 'string' || typeof key !== 'string') {
            throw new Error('both id and key should be of type string');
        }
        this._keys.set(id, key);
    }
    _verifyWS(ws, cb) {
        let proved = false;
        let confirmed = false;
        let remoteChallenge;
        let remotePeerInfo;
        const challenge = crypto.randomBytes(32).toString('hex');
        const timeout = setTimeout(() => {
            sendRejection(`Authentication time elapsed. proved: ${proved}, confirmed: ${confirmed}, challenge received: ${!!remoteChallenge}`);
        }, constants_js_1.AUTH_TIMEOUT);
        function send(event, data) {
            let msg = Buffer.concat([Buffer.from([event]), Buffer.from(JSON.stringify(data))]);
            ws.send(msg, { binary: true });
        }
        const isReady = () => {
            if (proved && confirmed) {
                clearTimeout(timeout);
                ws.removeEventListener('error', handleError);
                ws.removeEventListener('message', handleMessage);
                cb(null, remotePeerInfo);
            }
        };
        const handleError = (err) => {
            clearTimeout(timeout);
            ws.removeEventListener('message', handleMessage);
            cb(err);
        };
        const sendConfirmation = () => {
            confirmed = true;
            let conf = {
                id: this._peer.id,
                roles: this._peer.roles.map(({ name }) => name),
                friendly: this._peer.friendly,
                name: this._peer.name,
                meta: {
                    os: process.platform,
                    runtime: "nodejs " + process.version,
                    time: Date.now(),
                    uptime: (Date.now() - this._peer._constructed),
                    protocol: constants_js_1.PROTOCOL_VERSION
                },
            };
            ws.readyState === 1 &&
                send(constants_js_1.BYTE_AUTH_CONFIRMED, conf);
            isReady();
        };
        const sendRejection = (err) => {
            ws.readyState === 1 && send(constants_js_1.BYTE_ERROR, err);
            setImmediate(() => {
                clearTimeout(timeout);
                this._peer.emit('auth_error', err);
                cb('Verification error: ' + err);
            });
        };
        let handleMessage = (inp) => {
            let data;
            let event;
            event = inp[0];
            try {
                data = JSON.parse(inp.slice(1).toString());
            }
            catch (err) {
                data = inp.slice(1).toString();
            }
            switch (event) {
                case constants_js_1.BYTE_AUTH_CONFIRMED:
                    proved = true;
                    remotePeerInfo = data;
                    isReady();
                    break;
                case constants_js_1.BYTE_AUTH_CHALLENGE:
                    remoteChallenge = true;
                    if (!Array.isArray(data.ids)) {
                        sendRejection('Wrond data received: list of verification id`s should be an array. Got: ' + data);
                    }
                    else {
                        for (let id of data.ids) {
                            let key = this._keys.get(id);
                            if (key) {
                                let proof = crypto.createHmac('sha256', key).update(data.challenge).digest().toString('hex');
                                return send(constants_js_1.BYTE_AUTH_RESPONSE, { proof, id });
                            }
                        }
                        sendRejection('The peer has not such proofs: ' + data.ids);
                    }
                    break;
                case constants_js_1.BYTE_ERROR:
                    clearTimeout(timeout);
                    ws.removeEventListener('error', handleError);
                    ws.removeEventListener('message', handleMessage);
                    this._peer.emit('auth_error', `remote peer rejected auth: ${data}`);
                    cb('Auth error: ' + data);
                    break;
                case constants_js_1.BYTE_AUTH_RESPONSE:
                    let key = this._keys.get(data.id);
                    if (!key) {
                        return sendRejection('Verification ID is not registered: ' + data.id);
                    }
                    if (crypto.createHmac('sha256', key).update(challenge).digest().toString('hex') === data.proof) {
                        return sendConfirmation();
                    }
                    ;
                    sendRejection(`Preshared key mismatch: HMAC's are not identical. Got ${data.proof}. Make sure it is hex-encoded`);
                    break;
                default:
                    sendRejection('Incorrect event during handshake process: ' + event);
            }
        };
        ws.once('error', handleError);
        ws.on('message', handleMessage);
        if (this._keys.size < 1) {
            sendConfirmation();
        }
        else {
            send(constants_js_1.BYTE_AUTH_CHALLENGE, { challenge, ids: Array.from(this._keys.keys()) });
        }
    }
}
exports.Auth = Auth;
//# sourceMappingURL=Auth.js.map