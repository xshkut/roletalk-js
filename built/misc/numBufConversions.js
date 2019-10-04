"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function numberToBuffer(num) {
    let arr = [];
    arr.push(num % 256);
    let i = 1;
    while (num >= 256 ** i) {
        arr.push(Math.floor(num % 256 ** (i + 1) / 256 ** i));
        i++;
    }
    arr.reverse();
    return Buffer.from(arr);
}
exports.numberToBuffer = numberToBuffer;
function bufferToNumber(buffer) {
    return buffer.reverse().reduce((prev, curr, i) => {
        return prev + curr * 256 ** i;
    });
}
exports.bufferToNumber = bufferToNumber;
//# sourceMappingURL=numBufConversions.js.map