import { bufferToNumber, numberToBuffer } from "./numBufConversions";
import { InitialContext, InitialStreamContext, Context, StreamContext } from '../interfaces'
import { DATATYPE_BINARY, DATATYPE_NUMBER, DATATYPE_STRING, DATATYPE_JSON, DATATYPE_NULL, DATATYPE_BOOLEAN } from '../constants'

/**@internal */
export function serializeSingle(type: number, role: string = '', event: string = '', data: any) {
    let roleBuf = Buffer.from(role);
    let eventBuf = Buffer.from(event);
    return Buffer.concat([
        Buffer.from([type]),
        serialize2Bnumber(roleBuf.length),
        serialize2Bnumber(eventBuf.length),
        roleBuf, eventBuf, markDataType(data)]);
}

/**@internal */
export function serializeRequest(type: number, role: string = '', event: string = '', cb: number, data: any) {
    let roleBuf = Buffer.from(role);
    let eventBuf = Buffer.from(event);
    let cbBuf = numberToBuffer(cb);
    return Buffer.concat([
        Buffer.from([type]),
        serialize2Bnumber(roleBuf.length),
        serialize2Bnumber(eventBuf.length),
        Buffer.from([cbBuf.length]),
        roleBuf, eventBuf, cbBuf, markDataType(data)]);
}

/**@internal */
export function serializeStreamRequest(type: number, role: string = '', event: string = '', cb: number, ctr: number, data: any) {
    let roleBuf = Buffer.from(role);
    let eventBuf = Buffer.from(event);
    let correlBuf = numberToBuffer(cb);
    let control = numberToBuffer(ctr);
    let buf = Buffer.concat([
        Buffer.from([type]),
        serialize2Bnumber(roleBuf.length),
        serialize2Bnumber(eventBuf.length),
        Buffer.from([correlBuf.length]),
        Buffer.from([control.length]),
        roleBuf, eventBuf, correlBuf, control, markDataType(data)]);
    return buf;
}

/**@internal */
export function serializeResponse(type: number, cb: number, data: any) {
    let cbBuf = numberToBuffer(cb);
    return Buffer.concat([
        Buffer.from([type]),
        Buffer.from([cbBuf.length]),
        cbBuf,
        markDataType(data)]);
}

/**@internal */
export function serializeStreamResponse(type: number, cb: number, ctr: number, data: any) {
    let cbBuf = numberToBuffer(cb);
    let ctrBuf = numberToBuffer(ctr);
    return Buffer.concat([
        Buffer.from([type]),
        Buffer.from([cbBuf.length]),
        Buffer.from([ctrBuf.length]),
        cbBuf,
        ctrBuf,
        markDataType(data)]);
}

/**@internal */
export function serializeString(type: number, data: string) {
    return Buffer.concat([
        Buffer.from([type]),
        Buffer.from(data)
    ]);
}

/**@internal */
export function parseString(buf: Buffer): string {
    return buf.slice(1).toString();
}

/**@internal */
export function parseSingle(buf: Buffer): Context {
    let rlen = buf[1] * 256 + buf[2];
    let elen = buf[3] * 256 + buf[4];
    let lastRoleByte = rlen + 5;
    let payload = buf.slice(lastRoleByte + elen);
    let ctx = retriveData(payload) as Context;
    ctx.role = buf.slice(5, lastRoleByte).toString()
    ctx.event = buf.slice(lastRoleByte, lastRoleByte + elen).toString()
    return ctx;
}

const requestRoleFrom = 6;
/**@internal */
export function parseRequest(buf: Buffer): Context {
    let roleLen = buf[1] * 256 + buf[2];
    let eventLen = buf[3] * 256 + buf[4];
    let corlen = buf[5];
    let eventFrom = requestRoleFrom + roleLen;
    let corfrom = eventFrom + eventLen;
    let ctx = retriveData(buf.slice(corfrom + corlen)) as Context;
    ctx._correlation = bufferToNumber(buf.slice(corfrom, corfrom + corlen))
    ctx.role = buf.slice(requestRoleFrom, eventFrom).toString()
    ctx.event = buf.slice(eventFrom, corfrom).toString()
    return ctx;
}

const streamRoleFrom = 7;
/**@internal */
export function parseStreamRequest(buf: Buffer): StreamContext {
    let rlen = buf[1] * 256 + buf[2];
    let elen = buf[3] * 256 + buf[4];
    let corLen = buf[5];
    let ctrLen = buf[6];
    let eventFrom = streamRoleFrom + rlen;
    let correlFrom = eventFrom + elen;
    let ctrFrom = correlFrom + corLen;
    let ctx = retriveData(buf.slice(ctrFrom + ctrLen)) as StreamContext;
    ctx._correlation = bufferToNumber(buf.slice(correlFrom, correlFrom + corLen));
    ctx._ctr = bufferToNumber(buf.slice(ctrFrom, ctrFrom + ctrLen));
    ctx.role = buf.slice(streamRoleFrom, eventFrom).toString()
    ctx.event = buf.slice(eventFrom, correlFrom).toString();
    return ctx;
}

/**@internal */
export function parseResponse(buf: Buffer): InitialContext {
    let payload = buf.slice(buf[1] + 2);
    let ctx = retriveData(payload)
    ctx._correlation = bufferToNumber(buf.slice(2, 2 + buf[1]));
    return ctx;
}

/**@internal */
export function parseStreamResponse(buf: Buffer): InitialStreamContext {
    let ctrFrom = 3 + buf[1]
    let payloadFrom = ctrFrom + buf[2];
    let ctx = retriveData(buf.slice(payloadFrom))
    ctx._correlation = bufferToNumber(buf.slice(3, ctrFrom));
    (<InitialStreamContext>ctx)._ctr = bufferToNumber(buf.slice(ctrFrom, payloadFrom));
    return <InitialStreamContext>ctx;
}

function serialize2Bnumber(val: number) {
    return Buffer.from([Math.floor(val / 256), val % 256])
}

function markDataType(data: any): Buffer {
    if (Buffer.isBuffer(data)) {
        return Buffer.concat([Buffer.from([DATATYPE_BINARY]), data as Buffer]);
    } else if (data === null || data === undefined) {
        return Buffer.from([DATATYPE_NULL]);
    }
    switch (typeof data) {
        case 'number':
            return Buffer.concat([Buffer.from([DATATYPE_NUMBER]), Buffer.from((data as number).toString())]);
        case 'string':
            return Buffer.concat([Buffer.from([DATATYPE_STRING]), Buffer.from(data)]);
        case 'boolean':
            return Buffer.from([DATATYPE_BOOLEAN, data ? 1 : 0]);
        case 'object':
            return Buffer.concat([Buffer.from([DATATYPE_JSON]), Buffer.from(JSON.stringify(data))]);
    }
    return Buffer.from([DATATYPE_NULL]);
}

/**@internal */
function retriveData(payload: Buffer): InitialContext {
    let data = payload.slice(1)
    let type: string;
    switch (payload[0]) {
        case DATATYPE_BINARY:
            type = 'binary';
            return { data, type, origin: { raw: data, type } }
        case DATATYPE_NULL:
            type = 'null';
            return { data: null, type, origin: { raw: data, type } }
        case DATATYPE_BOOLEAN:
            type = 'boolean';
            return { data: data[0] === 0 ? false : true, type, origin: { raw: data, type } }
        case DATATYPE_STRING:
            type = 'string';
            return { data: data.toString(), type, origin: { raw: data, type } }
        case DATATYPE_NUMBER:
            type = 'number';
            return { data: Number(data.toString()), type, origin: { raw: data, type } }
        case DATATYPE_JSON:
            type = 'object';
            return { data: JSON.parse(data.toString()), type, origin: { raw: data, type } }
        default:
            type = '?';
            return { data: null, type, origin: { raw: data, type } }
    }
}


