const rt = require('../');
const stream = require('stream');
const Peer = new rt.Peer();
Peer.auth.addPresharedKey('echo', 'echo key');
let role = Peer.role('echo');


const start = async() => {
    await Peer.connect('ws://localhost:5000');
    let writable = Peer.destination('echo').Writable('echo');
    role.onReadable('echo', (ctx, cb) => {
        let i = 0;
        ctx.readable.on('data', (data) => {
            i += data.length;
        });
        let prevTime = Date.now();
        setInterval(() => {
            let now = Date.now();
            let speed = i * 1000 / 1024 / 1024 / (now - prevTime);
            console.log('speed <->:', speed.toFixed(2), 'MB/sec')
            i = 0;
            prevTime = now;
        }, 100)
        cb();
        ctx.readable.on('end', () => {
            Peer.close()
        })
    })
    writable.on('ready', () => {});
    let generator = new stream.Readable({
        read: function(size) {
            while (this.push(Buffer.allocUnsafe(size))) {}
        }
    })
    generator.pipe(writable);
}
start();