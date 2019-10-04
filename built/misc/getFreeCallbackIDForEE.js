"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../constants");
const numBufConversions_1 = require("./numBufConversions");
function getFreeCallbackIDForEE(ee) {
    let sid = Math.floor(Math.random() * 256 ** constants_1.STREAM_RANDOM_BYTES_LENGTH);
    while (ee.listenerCount(numBufConversions_1.numberToBuffer(sid).toString('hex')) > 0) {
        sid++;
    }
    return sid;
}
exports.getFreeCallbackIDForEE = getFreeCallbackIDForEE;
//# sourceMappingURL=getFreeCallbackIDForEE.js.map