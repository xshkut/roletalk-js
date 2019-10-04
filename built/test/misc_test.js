"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const SetWithRoundRobin_1 = require("../misc/SetWithRoundRobin");
const numBufConversions_1 = require("../misc/numBufConversions");
describe('Testing SetWithRoundRobin', () => {
    it('Should return newly added values after internal iterator had been created', () => {
        let set = new SetWithRoundRobin_1.SetWithRoundRobin();
        set.add(1);
        assert_1.default(set.nextValue() === 1);
        set.add(2);
        assert_1.default(set.nextValue() === 2);
        assert_1.default(set.nextValue() === 1);
    });
    it('Should return undefined if set has no values', () => {
        let set = new SetWithRoundRobin_1.SetWithRoundRobin();
        assert_1.default(set.nextValue() === undefined);
        set.add(2);
        set.delete(2);
        assert_1.default(set.nextValue() === undefined);
    });
});
describe('Testing number<->buffer conversion', () => {
    it('numberToBuffer', () => {
        assert_1.default.deepEqual(numBufConversions_1.numberToBuffer(0), Buffer.from([0]));
        assert_1.default.deepEqual(numBufConversions_1.numberToBuffer(255), Buffer.from([255]));
        assert_1.default.deepEqual(numBufConversions_1.numberToBuffer(256), Buffer.from([1, 0]));
        assert_1.default.deepEqual(numBufConversions_1.numberToBuffer(256 * 100), Buffer.from([100, 0]));
        assert_1.default.deepEqual(numBufConversions_1.numberToBuffer(256 ** 2 * 100 + 256 * 50 + 25), Buffer.from([100, 50, 25]));
    });
    it('BufferToNumber', () => {
        assert_1.default.equal(numBufConversions_1.bufferToNumber(Buffer.from([0])), 0);
        assert_1.default.equal(numBufConversions_1.bufferToNumber(Buffer.from([255])), 255);
        assert_1.default.equal(numBufConversions_1.bufferToNumber(Buffer.from([75, 0])), 256 * 75);
        assert_1.default.equal(numBufConversions_1.bufferToNumber(Buffer.from([25, 117, 255])), 256 ** 2 * 25 + 256 ** 1 * 117 + 255);
    });
});
//# sourceMappingURL=misc_test.js.map