const rt = require('../');
const stream = require('stream');

const echoPeer = new rt.Peer();
let port = process.argv[2] || 5000;
echoPeer.auth.addPresharedKey('echo', 'echo key');
echoPeer.listen(Number(port));
const echoRole = echoPeer.role('echo');

echoPeer.on('auth_error', err => {
    console.log(`Remote peer failed auth: ${err}`)
})

echoRole.onMessage('echo', (ctx) => {
    console.log(`\tMessage (${ctx.unit.id}): {${ctx.type}} ${ctx.data}`)
    echoPeer.destination('echo').send({ unit: ctx.unit, event: 'echo' }, ctx.data);
});

echoRole.onRequest('echo', (ctx, cb) => {
    console.log(`\tRequest (${ctx.unit.id}): {${ctx.type}} ${ctx.data}`)
    cb(null, ctx.data);
})

echoRole.onReadable('echo', (ctx, cb) => {
    let writable = echoPeer.destination('echo').Writable({ unit: ctx.unit, event: 'echo' }, ctx.data);
    console.log(`\tUnit requested for readable stream (${ctx.unit.id}). Writable mirror stream created...`)
    let bytes = 0;
    writable.on('ready', () => {
        ctx.readable.pipe(new stream.Transform({
            transform: (chunk, enc, cb) => {
                bytes += chunk.length;
                cb(null, chunk)
            }
        })).pipe(writable);
        console.log(`\Unit accepted to pull stream (${ctx.unit.id}). Confirming readable stream session...`)
        cb();
    })
    ctx.readable.on('error', err => console.log(err.toString()));
    writable.on('error', err => console.log(err.toString()));
    writable.on('finish', () => {
        console.log(`\tAll outgoing data transferred (${ctx.unit.id}). - ${bytes} bytes`);
    })
})

echoRole.onWritable('echo', (ctx, cb) => {
    let readable = echoPeer.destination('echo').Readable({ unit: ctx.unit, event: 'echo' }, ctx.data);
    console.log(`\tUnit requested for writable stream (${ctx.unit.id}). Readable mirror stream created...`)
    let bytes = 0;
    readable.on('ready', () => {
        readable.pipe(new stream.Transform({
            transform: (chunk, enc, cb) => {
                bytes += chunk.length;
                cb(null, chunk)
            }
        })).pipe(ctx.writable);
        console.log(`\Unit accepted to push stream (${ctx.unit.id}). Confirming writable stream session...`)
        cb();
    })
    ctx.writable.on('error', err => console.log(err.toString()));
    readable.on('error', err => console.log(err.toString()));
    ctx.writable.on('finish', () => {
        console.log(`\tAll outgoing data transferred (${ctx.unit.id}). - ${bytes} bytes`);
    })
})

echoPeer.on('unit', unit => {
    console.log(`Unit connected: ${unit.id} (${unit.meta.os}; ${unit.meta.runtime})`);
    unit.on('close', () => {
        console.log(`Unit disconnected: ${unit.id} (${unit.meta.os}; ${unit.meta.runtime})`);
    })
})

console.log(`Echo role-talk server is listening on ${port}. Role: "echo", events: "echo"\n`);