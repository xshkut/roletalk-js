import { Peer } from './Peer';
import { PeerOptions } from './interfaces';

let singleton: Peer;

/**Singleton instance of Peer*/
let Singleton = function(options?: PeerOptions): Peer {
    singleton = singleton || new Peer(options);
    return singleton;
};

export { Singleton };

// export default Peer;
export * from './Peer'
export * from './interfaces'
export * from './Unit';
export * from './Role';
export * from './Destination';
