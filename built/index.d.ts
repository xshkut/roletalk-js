import { Peer } from './Peer';
import { PeerConstructorOprions } from './interfaces';
declare let Singleton: (options?: PeerConstructorOprions | undefined) => Peer;
export { Peer, Singleton };
export default Peer;
export * from './Auth';
export * from './Unit';
export * from './Role';
export * from './Destination';
//# sourceMappingURL=index.d.ts.map