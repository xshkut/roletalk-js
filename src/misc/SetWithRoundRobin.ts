export class SetWithRoundRobin<T> extends Set<T> {
    _infiniteEntryIterator: Iterator<T | undefined>
    constructor () {
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
                } else {
                    yield undefined;
                }
            }
        };
        this._infiniteEntryIterator = Gen();
    }
    nextValue(): T | undefined {
        return this._infiniteEntryIterator.next().value;
    }
}