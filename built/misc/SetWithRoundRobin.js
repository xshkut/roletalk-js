"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class SetWithRoundRobin extends Set {
    constructor() {
        super();
        let iter = this.values();
        let ctx = this;
        let Gen = function* () {
            while (true) {
                if (ctx.size > 0) {
                    let elem = iter.next();
                    if (elem.done) {
                        iter = ctx.values();
                        elem = iter.next();
                    }
                    yield elem.value;
                }
                else {
                    yield undefined;
                }
            }
        };
        this._infiniteEntryIterator = Gen();
    }
    nextValue() {
        return this._infiniteEntryIterator.next().value;
    }
}
exports.SetWithRoundRobin = SetWithRoundRobin;
//# sourceMappingURL=SetWithRoundRobin.js.map