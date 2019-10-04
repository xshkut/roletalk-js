"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
const Peer_1 = require("./Peer");
exports.Peer = Peer_1.Peer;
let singleton;
let Singleton = function (options) {
    singleton = singleton || new Peer_1.Peer(options);
    return singleton;
};
exports.Singleton = Singleton;
exports.default = Peer_1.Peer;
__export(require("./Auth"));
__export(require("./Unit"));
__export(require("./Role"));
__export(require("./Destination"));
//# sourceMappingURL=index.js.map