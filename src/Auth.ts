import * as crypto from "crypto";
import { Peer } from "./Peer";
import * as WebSocket from "ws";
import {
  BYTE_AUTH_CONFIRMED,
  BYTE_AUTH_CHALLENGE,
  BYTE_AUTH_RESPONSE,
  BYTE_ERROR,
  AUTH_TIMEOUT,
  PROTOCOL_VERSION,
} from "./constants";
import { PeerConfirmData } from "./interfaces";

/**@internal */
export class Auth {
  _keys: Map<string, string> = new Map();
  _peer: Peer;
  constructor(peer: Peer) {
    this._peer = peer;
  }
  /**Add preshared keypair for authentications*/
  addPresharedKey(id: string, key: string) {
    if (typeof id !== "string" || typeof key !== "string") {
      throw new Error("both id and key should be of type string");
    }
    this._keys.set(id, key);
  }
  /**@internal */
  _verifyWS(ws: WebSocket, cb: (err?: any, res?: any) => void) {
    let proved = false;
    let confirmed = false;
    let remoteChallenge: any;
    let remotePeerInfo: any;
    const challenge = crypto.randomBytes(32).toString("hex");
    const timeout = setTimeout(() => {
      sendRejection(
        `Authentication time elapsed. proved: ${proved}, confirmed: ${confirmed}, challenge received: ${!!remoteChallenge}`
      );
    }, AUTH_TIMEOUT);
    function send(event: number, data: any) {
      let msg = Buffer.concat([
        Buffer.from([event]),
        Buffer.from(JSON.stringify(data)),
      ]);
      ws.send(msg, { binary: true });
    }
    const isReady = () => {
      if (proved && confirmed) {
        clearTimeout(timeout);
        ws.removeEventListener("error", handleError);
        ws.removeEventListener("message", handleMessage as any);
        cb(null, remotePeerInfo);
      }
    };
    const handleError = (err?: any): void => {
      clearTimeout(timeout);
      ws.removeEventListener("message", handleMessage as any);
      cb(err);
    };
    const sendConfirmation = () => {
      confirmed = true;
      let conf: PeerConfirmData = {
        id: this._peer.id,
        roles: this._peer.roles.map(({ name }) => name),
        friendly: this._peer.friendly,
        name: this._peer.name,
        meta: {
          os: process.platform,
          runtime: "nodejs " + process.version,
          time: Date.now(),
          uptime: Date.now() - this._peer._constructed,
          protocol: PROTOCOL_VERSION,
        },
      };
      ws.readyState === 1 && send(BYTE_AUTH_CONFIRMED, conf);
      isReady();
    };
    const sendRejection = (err: string) => {
      ws.readyState === 1 && send(BYTE_ERROR, err);
      setImmediate(() => {
        clearTimeout(timeout);
        this._peer.emit("auth_error", err);
        cb("Verification error: " + err);
      });
    };
    let handleMessage = (inp: Buffer) => {
      let data;
      let event;
      event = inp[0];
      try {
        data = JSON.parse(inp.slice(1).toString());
      } catch (err) {
        data = inp.slice(1).toString();
      }
      switch (event) {
        case BYTE_AUTH_CONFIRMED:
          proved = true;
          remotePeerInfo = data;
          isReady();
          break;
        case BYTE_AUTH_CHALLENGE:
          remoteChallenge = true;
          if (!Array.isArray(data.ids)) {
            sendRejection(
              "Wrond data received: list of verification id`s should be an array. Got: " +
              data
            );
          } else {
            for (let id of data.ids) {
              let key = this._keys.get(id)!;
              if (key) {
                let proof = crypto
                  .createHmac("sha256", key)
                  .update(data.challenge)
                  .digest()
                  .toString("hex");
                return send(BYTE_AUTH_RESPONSE, { proof, id });
              }
            }
            sendRejection("The peer has not such proofs: " + data.ids);
          }
          break;
        case BYTE_ERROR:
          clearTimeout(timeout);
          ws.removeEventListener("error", handleError);
          ws.removeEventListener("message", handleMessage as any);
          this._peer.emit("auth_error", `remote peer rejected auth: ${data}`);
          cb("Auth error: " + data);
          break;
        case BYTE_AUTH_RESPONSE:
          let key = this._keys.get(data.id);
          if (!key) {
            return sendRejection(
              "Verification ID is not registered: " + data.id
            );
          }
          if (
            crypto
              .createHmac("sha256", key)
              .update(challenge)
              .digest()
              .toString("hex") === data.proof
          ) {
            return sendConfirmation();
          }
          sendRejection(`Preshared key mismatch. Chosen id: ${data.id}`);
          break;
        default:
          sendRejection("Incorrect event during handshake process: " + event);
      }
    };
    ws.once("error", handleError);
    ws.on("message", handleMessage);
    if (this._keys.size < 1) {
      sendConfirmation();
    } else {
      send(BYTE_AUTH_CHALLENGE, {
        challenge,
        ids: Array.from(this._keys.keys()),
      });
    }
  }
}
