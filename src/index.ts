import { Peer } from './Peer';
import { PeerConstructorOprions } from './interfaces';

let singleton: Peer;
let Singleton = function (options?: PeerConstructorOprions): Peer {
	singleton = singleton || new Peer(options);
	return singleton;
};

export { Peer, Singleton };
export default Peer;

export * from './Auth';
export * from './Unit';
export * from './Role';
export * from './Destination';
