import * as assert from "assert";
import { SetWithRoundRobin } from "../misc/SetWithRoundRobin";
import { numberToBuffer, bufferToNumber } from "../misc/numBufConversions";

describe("Testing SetWithRoundRobin", () => {
  it("Should return newly added values after internal iterator had been created", () => {
    let set = new SetWithRoundRobin();
    set.add(1);
    assert(set.nextValue() === 1);
    set.add(2);
    assert(set.nextValue() === 2);
    assert(set.nextValue() === 1);
  });
  it("Should return undefined if set has no values", () => {
    let set = new SetWithRoundRobin();
    assert(set.nextValue() === undefined);
    set.add(2);
    set.delete(2);
    assert(set.nextValue() === undefined);
  });
});

describe("Testing number<->buffer conversion", () => {
  it("numberToBuffer", () => {
    assert.deepEqual(numberToBuffer(0), Buffer.from([0]));
    assert.deepEqual(numberToBuffer(255), Buffer.from([255]));
    assert.deepEqual(numberToBuffer(256), Buffer.from([1, 0]));
    assert.deepEqual(numberToBuffer(256 * 100), Buffer.from([100, 0]));
    assert.deepEqual(
      numberToBuffer(256 ** 2 * 100 + 256 * 50 + 25),
      Buffer.from([100, 50, 25])
    );
  });
  it("BufferToNumber", () => {
    assert.equal(bufferToNumber(Buffer.from([0])), 0);
    assert.equal(bufferToNumber(Buffer.from([255])), 255);
    assert.equal(bufferToNumber(Buffer.from([75, 0])), 256 * 75);
    assert.equal(
      bufferToNumber(Buffer.from([25, 117, 255])),
      256 ** 2 * 25 + 256 ** 1 * 117 + 255
    );
  });
});
