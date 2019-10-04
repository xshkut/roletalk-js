import { InitialContextData, InitialStreamContextData, ContextData, StreamContextData } from '../interfaces';
export declare function serializeSingle(type: number, role: string | undefined, event: string | undefined, data: any): Buffer;
export declare function serializeRequest(type: number, role: string | undefined, event: string | undefined, cb: number, data: any): Buffer;
export declare function serializeStreamRequest(type: number, role: string | undefined, event: string | undefined, cb: number, ctr: number, data: any): Buffer;
export declare function serializeResponse(type: number, cb: number, data: any): Buffer;
export declare function serializeStreamResponse(type: number, cb: number, ctr: number, data: any): Buffer;
export declare function serializeString(type: number, data: string): Buffer;
export declare function parseString(buf: Buffer): string;
export declare function parseSingle(buf: Buffer): ContextData;
export declare function parseRequest(buf: Buffer): ContextData;
export declare function parseStreamRequest(buf: Buffer): StreamContextData;
export declare function parseResponse(buf: Buffer): InitialContextData;
export declare function parseStreamResponse(buf: Buffer): InitialStreamContextData;
//# sourceMappingURL=protocolConversions.d.ts.map