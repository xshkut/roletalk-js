/// <reference types="node" />
import { EventEmitter } from 'events';
import { PeerMetaData } from './interfaces';
export declare class Unit extends EventEmitter {
    readonly id: string;
    getRoles(): string[];
    get name(): string | undefined;
    get meta(): PeerMetaData;
    close(): void;
}
export interface Unit {
    on(event: 'close', handler: () => void): this;
    on(event: 'error', handler: () => void): this;
}
//# sourceMappingURL=Unit.d.ts.map