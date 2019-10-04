"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const numBufConversions_1 = require("./numBufConversions");
const constants_1 = require("../constants");
function serializeSingle(type, role = '', event = '', data) {
    let roleBuf = Buffer.from(role);
    let eventBuf = Buffer.from(event);
    return Buffer.concat([
        Buffer.from([type]),
        serialize2Bnumber(roleBuf.length),
        serialize2Bnumber(eventBuf.length),
        roleBuf, eventBuf, markDataType(data)
    ]);
}
exports.serializeSingle = serializeSingle;
function serializeRequest(type, role = '', event = '', cb, data) {
    let roleBuf = Buffer.from(role);
    let eventBuf = Buffer.from(event);
    let cbBuf = numBufConversions_1.numberToBuffer(cb);
    return Buffer.concat([
        Buffer.from([type]),
        serialize2Bnumber(roleBuf.length),
        serialize2Bnumber(eventBuf.length),
        Buffer.from([cbBuf.length]),
        roleBuf, eventBuf, cbBuf, markDataType(data)
    ]);
}
exports.serializeRequest = serializeRequest;
function serializeStreamRequest(type, role = '', event = '', cb, ctr, data) {
    let roleBuf = Buffer.from(role);
    let eventBuf = Buffer.from(event);
    let correlBuf = numBufConversions_1.numberToBuffer(cb);
    let control = numBufConversions_1.numberToBuffer(ctr);
    let buf = Buffer.concat([
        Buffer.from([type]),
        serialize2Bnumber(roleBuf.length),
        serialize2Bnumber(eventBuf.length),
        Buffer.from([correlBuf.length]),
        Buffer.from([control.length]),
        roleBuf, eventBuf, correlBuf, control, markDataType(data)
    ]);
    return buf;
}
exports.serializeStreamRequest = serializeStreamRequest;
function serializeResponse(type, cb, data) {
    let cbBuf = numBufConversions_1.numberToBuffer(cb);
    return Buffer.concat([
        Buffer.from([type]),
        Buffer.from([cbBuf.length]),
        cbBuf,
        markDataType(data)
    ]);
}
exports.serializeResponse = serializeResponse;
function serializeStreamResponse(type, cb, ctr, data) {
    let cbBuf = numBufConversions_1.numberToBuffer(cb);
    let ctrBuf = numBufConversions_1.numberToBuffer(ctr);
    return Buffer.concat([
        Buffer.from([type]),
        Buffer.from([cbBuf.length]),
        Buffer.from([ctrBuf.length]),
        cbBuf,
        ctrBuf,
        markDataType(data)
    ]);
}
exports.serializeStreamResponse = serializeStreamResponse;
function serializeString(type, data) {
    return Buffer.concat([
        Buffer.from([type]),
        Buffer.from(data)
    ]);
}
exports.serializeString = serializeString;
function parseString(buf) {
    return buf.slice(1).toString();
}
exports.parseString = parseString;
function parseSingle(buf) {
    let rlen = buf[1] * 256 + buf[2];
    let elen = buf[3] * 256 + buf[4];
    let lastRoleByte = rlen + 5;
    let payload = buf.slice(lastRoleByte + elen);
    let ctx = retriveData(payload);
    ctx.role = buf.slice(5, lastRoleByte).toString();
    ctx.event = buf.slice(lastRoleByte, lastRoleByte + elen).toString();
    return ctx;
}
exports.parseSingle = parseSingle;
const requestRoleFrom = 6;
function parseRequest(buf) {
    let roleLen = buf[1] * 256 + buf[2];
    let eventLen = buf[3] * 256 + buf[4];
    let corlen = buf[5];
    let eventFrom = requestRoleFrom + roleLen;
    let corfrom = eventFrom + eventLen;
    let ctx = retriveData(buf.slice(corfrom + corlen));
    ctx._correlation = numBufConversions_1.bufferToNumber(buf.slice(corfrom, corfrom + corlen));
    ctx.role = buf.slice(requestRoleFrom, eventFrom).toString();
    ctx.event = buf.slice(eventFrom, corfrom).toString();
    return ctx;
}
exports.parseRequest = parseRequest;
const streamRoleFrom = 7;
function parseStreamRequest(buf) {
    let rlen = buf[1] * 256 + buf[2];
    let elen = buf[3] * 256 + buf[4];
    let corLen = buf[5];
    let ctrLen = buf[6];
    let eventFrom = streamRoleFrom + rlen;
    let correlFrom = eventFrom + elen;
    let ctrFrom = correlFrom + corLen;
    let ctx = retriveData(buf.slice(ctrFrom + ctrLen));
    ctx._correlation = numBufConversions_1.bufferToNumber(buf.slice(correlFrom, correlFrom + corLen));
    ctx._ctr = numBufConversions_1.bufferToNumber(buf.slice(ctrFrom, ctrFrom + ctrLen));
    ctx.role = buf.slice(streamRoleFrom, eventFrom).toString();
    ctx.event = buf.slice(eventFrom, correlFrom).toString();
    return ctx;
}
exports.parseStreamRequest = parseStreamRequest;
function parseResponse(buf) {
    let payload = buf.slice(buf[1] + 2);
    let ctx = retriveData(payload);
    ctx._correlation = numBufConversions_1.bufferToNumber(buf.slice(2, 2 + buf[1]));
    return ctx;
}
exports.parseResponse = parseResponse;
function parseStreamResponse(buf) {
    let ctrFrom = 3 + buf[1];
    let payloadFrom = ctrFrom + buf[2];
    let ctx = retriveData(buf.slice(payloadFrom));
    ctx._correlation = numBufConversions_1.bufferToNumber(buf.slice(3, ctrFrom));
    ctx._ctr = numBufConversions_1.bufferToNumber(buf.slice(ctrFrom, payloadFrom));
    return ctx;
}
exports.parseStreamResponse = parseStreamResponse;
function serialize2Bnumber(val) {
    return Buffer.from([Math.floor(val / 256), val % 256]);
}
function markDataType(data) {
    if (Buffer.isBuffer(data)) {
        return Buffer.concat([Buffer.from([constants_1.DATATYPE_BINARY]), data]);
    }
    else if (data === null || data === undefined) {
        return Buffer.from([constants_1.DATATYPE_NULL]);
    }
    switch (typeof data) {
        case 'number':
            return Buffer.concat([Buffer.from([constants_1.DATATYPE_NUMBER]), Buffer.from(data.toString())]);
        case 'string':
            return Buffer.concat([Buffer.from([constants_1.DATATYPE_STRING]), Buffer.from(data)]);
        case 'boolean':
            return Buffer.from([constants_1.DATATYPE_BOOLEAN, data ? 1 : 0]);
        case 'object':
            return Buffer.concat([Buffer.from([constants_1.DATATYPE_JSON]), Buffer.from(JSON.stringify(data))]);
    }
    return Buffer.from([constants_1.DATATYPE_NULL]);
}
function retriveData(payload) {
    let data = payload.slice(1);
    let type;
    switch (payload[0]) {
        case constants_1.DATATYPE_BINARY:
            type = 'binary';
            return { data, type, origin: { raw: data, type } };
        case constants_1.DATATYPE_NULL:
            type = 'null';
            return { data: null, type, origin: { raw: data, type } };
        case constants_1.DATATYPE_BOOLEAN:
            type = 'boolean';
            return { data: data[0] === 0 ? false : true, type, origin: { raw: data, type } };
        case constants_1.DATATYPE_STRING:
            type = 'string';
            return { data: data.toString(), type, origin: { raw: data, type } };
        case constants_1.DATATYPE_NUMBER:
            type = 'number';
            return { data: Number(data.toString()), type, origin: { raw: data, type } };
        case constants_1.DATATYPE_JSON:
            type = 'object';
            return { data: JSON.parse(data.toString()), type, origin: { raw: data, type } };
        default:
            type = '?';
            return { data: null, type, origin: { raw: data, type } };
    }
}
//# sourceMappingURL=protocolConversions.js.map