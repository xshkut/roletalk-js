import EventEmitter from 'events';
import {
    STREAM_RANDOM_BYTES_LENGTH
} from '../constants';
import { numberToBuffer } from './numBufConversions';

export function getFreeCallbackIDForEE(ee: EventEmitter): number {
    let sid = Math.floor(Math.random() * 256 ** STREAM_RANDOM_BYTES_LENGTH);
    while (ee.listenerCount(numberToBuffer(sid).toString('hex')) > 0) {
        sid++;
    }
    return sid;
}