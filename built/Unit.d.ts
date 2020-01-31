/// <reference types="node" />
import EventEmitter from 'events';
import { InitialUnitData, PeerMetaData } from './interfaces';
export declare class Unit extends EventEmitter {
    readonly id: string;
    constructor({ peer, id, friendly, name, roles, meta }: InitialUnitData);
    getRoles(): string[];
    readonly name: string | undefined;
    readonly meta: PeerMetaData;
    close(): void;
}
export interface Unit {
    on(event: 'close', handler: () => void): this;
    on(event: 'error', handler: () => void): this;
}
//# sourceMappingURL=Unit.d.ts.map