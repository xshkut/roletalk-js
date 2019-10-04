const rt = require('../');
const EventEmitter = require('events');
const assert = require('assert');
const crypto = require('crypto');

const Peer = new rt.Peer();
let dest = Peer.destination('echo');
let role = Peer.role('echo');
let ee = new EventEmitter();
Peer.auth.addPresharedKey('echo', 'echo key');


describe('Should connect successfully', () => {
    before(async() => {
            await Peer.connect('http://localhost:5000');
            role.onMessage('echo', (ctx) => {
                ee.emit('message', ctx);
            })
        })
        // let tested_data = 1;
        // let tests = [null, 1, 'some string'];
    let tests = [null, true, false, 1.005, -5, 'some string', '', { a: 1, b: { c: 2 }, d: [null, -5, 'awd', true], e: false }];
    for (let tested_data of tests) {
        it('single message should be echoed. Type: ' + typeof tested_data, (done) => {
            dest.send('echo', tested_data);
            ee.once('message', (ctx) => {
                assert.deepEqual(ctx.data, tested_data);
                done();
            })
        })
        it('response to request should be identical. Type: ' + typeof tested_data, (done) => {
            dest.request('echo', tested_data, (err, ctx) => {
                assert(!err);
                assert.deepEqual(ctx.data, tested_data);
                done()
            })
        })
    }
    it('Writable stream should cause feedback stream with identical data', (done) => {
        let writable = dest.Writable('echo');
        let originalHmac = crypto.createHmac('sha256', 'some key');
        let receivedHmac = crypto.createHmac('sha256', 'some key');
        role.onReadable('echo', (ctx, cb) => {
            cb();
            let N = 1024 * 1024 * 10;
            for (let i = 0; i < N; i++) {
                let chunk = crypto.randomBytes(Math.floor(Math.random() * 10))
                writable.write(chunk);
                originalHmac.update(chunk);
            }
            writable.end();
            ctx.readable.pipe(receivedHmac, { end: false })
            ctx.readable.on('end', () => {
                let result1 = originalHmac.digest();
                let result2 = receivedHmac.digest();
                assert(Buffer.compare(result1, result2) === 0);
                done()
            });
        })
    })
    it('Readable stream should cause writable stream with identical data', (done) => {
        let readable = dest.Readable('echo');
        let originalHmac = crypto.createHmac('sha256', 'some key');
        let receivedHmac = crypto.createHmac('sha256', 'some key');
        role.onWritable('echo', (ctx, cb) => {
            cb();
            let N = 1024 * 1024 * 10;
            for (let i = 0; i < N; i++) {
                let chunk = crypto.randomBytes(Math.floor(Math.random() * 10))
                ctx.writable.write(chunk);
                originalHmac.update(chunk);
            }
            generator.pipe(writable);
            ctx.writable.end();
            readable.pipe(receivedHmac, { end: false })
            readable.on('end', () => {
                let result1 = originalHmac.digest();
                let result2 = receivedHmac.digest();
                assert(Buffer.compare(result1, result2) === 0);
                done()
            });
        })
    })
    after(() => {
        Peer.close();
    })
});