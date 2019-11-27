"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dummyPrivateKey = `
-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEArhLW7vFoWbdeYiu/3KfTVzCvCfe4J2V4KJUjiZpw7+tKeda9
jylI+jVxfS5okBON69tQS1MiMNYqvMT12NyIeiO9Zy4x19n4BcA+dGsfBcuAAy5o
5ovcMjhBANBoJJ0QDRQimpOQq2iZKRVRLlxZ1JTkmBy++O0czh2RK13jm8FKAmh0
1CdKPRJ3vpnPDC6wuFjQZaLrCUGJ+/9vQWetWPzqz7fymHrCAHaSEt/5Vw7DlIT1
KcV/F8bZGqIUcLXjJeQeNp4Vz99wldEYu+fDCcqDejJSKXDCMjk9h4oO0v3tRXyA
f4eJ5I1VIHfzVni/A6YsdXAK2v3s177s71yk6wIDAQABAoIBADheNWdumOHkdRXJ
IPntBozHYQcTRnjLbNuHX9ihQE0Qni9SEFQZhF4xjCyDKKzvCBgGDrw1kW7LC0/R
X+L3luImTKDq3o0NMjl6hT7hqUwRF8Tv9FwjkgxZFwOSeQbSLW5uxL3VZxV6a45Y
Ls+abCRgip2PQXAOKDO+c1Hdt2Sp6/uZYy/sty9ycBRkZs6oz4TfeUtNmJcH89cc
rv3plsXJTvVM9ilBny2FdWQ1zbFbaAGrZkToG4i44iEZ6y54GqocMsht/W1xHZ6+
ULrk2HYlWERbBDtzreotmFXiP/PRL/4sRcO3te+9054g8DyupqHjmUppEBxrc+GL
QFuk3qECgYEA08E8xzqZYDGNuVcrXMAdI7QECSuejOwaE1WEyTI89V7ZCeIEd5nc
jQAC9hdLqlWSu3TBjH34gOjCizKrYq0G1A9gBKCtjwRp6o4tLh2ebRJubkbwshSS
uLTCwyABdtvLKTlISrtxAl0NqGWzuBEQEP7HgbqVfyWgv7zOEEVPorkCgYEA0nII
fjmO/IwvwP/mv3aPE2br+ShrJTF8Wh7imx9+O/o8VVQkApqL3bl9WFyfmcg4cElp
a4OmlELLhpooMoUJlvyR/FZoHtGnI0KUprB1WWd/zuzRPWB0chPen5zknJ8BHfLR
/oSL9FHSSiCkviij3m7mfly7+M/iM+u8p5nAQsMCgYAkCUGfohBR93zn6ra9bRBI
cC0zplGwJ8n0OlyDpOIM29xRuz4JYIzRDgxy9tnwnel/r0n078cnoPTinXffLhT4
Z7lucC25JgYkXZfAvlektjtG1xnFJI0nk9OFQ2AcayEy3cW4uhdsUIuvecdQ7s5u
Jf2rzSX94lht6OKkkDcSOQKBgQC61ZLEvcU8Yhljd84c3d1YlF+b7U5yzuRf/lug
7OzdwuQdvX3a8eqLB0tJT7JCjYfN6N83HMKfjk2zStm1QHerHMFfDjeSZP/GRi5D
bxZAMas+wvFhVGkNfqZ/foNYqbIMLLBTDspSNvJD7YdVbC9QI5VvSlV4KNfi0L/E
7LPMkQKBgDVpQBmyOv5e2zDbhAkiqcHPc47AoNVr5rGLUMoANrsq8NfIx0yGB4Sv
4xm2Ie3xndmCr3RxQl3ZUzdZGOU3VWt6W/NeGyKGk9PXoGfzMZsrYiBXzqV/9xGb
BcR8UNjLD16QEd2zNmZFQq9glMJWFG33wTunJ9KH4TvjcYf0UCx8
-----END RSA PRIVATE KEY-----
`;
const dummyPublicKey = `-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJALdQTwMV26/0MA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV
BAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBX
aWRnaXRzIFB0eSBMdGQwHhcNMTgxMTMwMTExOTA3WhcNMjEwOTE5MTExOTA3WjBF
MQswCQYDVQQGEwJBVTETMBEGA1UECAwKU29tZS1TdGF0ZTEhMB8GA1UECgwYSW50
ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIB
CgKCAQEArhLW7vFoWbdeYiu/3KfTVzCvCfe4J2V4KJUjiZpw7+tKeda9jylI+jVx
fS5okBON69tQS1MiMNYqvMT12NyIeiO9Zy4x19n4BcA+dGsfBcuAAy5o5ovcMjhB
ANBoJJ0QDRQimpOQq2iZKRVRLlxZ1JTkmBy++O0czh2RK13jm8FKAmh01CdKPRJ3
vpnPDC6wuFjQZaLrCUGJ+/9vQWetWPzqz7fymHrCAHaSEt/5Vw7DlIT1KcV/F8bZ
GqIUcLXjJeQeNp4Vz99wldEYu+fDCcqDejJSKXDCMjk9h4oO0v3tRXyAf4eJ5I1V
IHfzVni/A6YsdXAK2v3s177s71yk6wIDAQABo1AwTjAdBgNVHQ4EFgQUHuSySgoZ
4rbeka1GvXN3AQiW95IwHwYDVR0jBBgwFoAUHuSySgoZ4rbeka1GvXN3AQiW95Iw
DAYDVR0TBAUwAwEB/zANBgkqhkiG9w0BAQsFAAOCAQEAHxXeXe0PS+mIbitl/qWD
Tl6IGWoI3bIvzcN1+eQjSHeGbzHPbS/wfpJOEbeeqNYHIzkpAEVOB5TJMIh8fRf9
mXAD72VZP+jsqiwVCpvltNuk47mqAZT4JKnWVDiaJ+iy6eTCZKh8MR+jzam77nP2
v4dxhHqfIGhPC2ry0WE+P6h1PruWyM6QfXHGHAqTh3zsLBKKhbaR/+QKFzgvzf6k
irr7pizHzbj3X0WACRubgqqi2tu9I+m7bJTBQSfzrxCxShCGqyoiJdJoL5oulQZW
dYmemaIOyNbyF0KRWKQCglKMzd9m4VWbI71j6JVya6f6ypoOoB5dmcdVpEP5NPGH
mQ==
-----END CERTIFICATE-----
`;
exports.AUTH_TIMEOUT = 4000;
exports.HEARTBEAT_INTERVAL = 5000;
exports.HEARTBEAT_TIMEOUT = 2000;
exports.DEFAULT_REQUEST_TIMEOUT = 5 * 60 * 1000;
exports.ROLES_MESSAGE = '_role_status';
exports.WRITABLE_STREAM_REQUEST_MESSAGE = '_writable_request';
exports.READABLE_STREAM_REQUEST_MESSAGE = '_readable_request';
exports.STREAM_RANDOM_BYTES_LENGTH = 2;
exports.PUBLICKEY = dummyPublicKey;
exports.PRIVATEKEY = dummyPrivateKey;
exports.WS_MANUAL_CLOSE_CODE = 4000;
exports.WS_HEARTBEAT_TIMEOUT_CLOSE_CODE = 4001;
exports.WS_AUTH_ERROR_CLOSE = 4002;
exports.PEER_RECONNECT_SUCCESS_EVENT = 'reconnect_success';
exports.PEER_RECONNECT_FAIL_EVENT = 'reconnect_fail';
exports.BYTE_ERROR = 0;
exports.BYTE_AUTH_CHALLENGE = 1;
exports.BYTE_AUTH_RESPONSE = 2;
exports.BYTE_AUTH_CONFIRMED = 3;
exports.TYPE_MSG = 100;
exports.TYPE_REQ = 101;
exports.TYPE_RES = 102;
exports.TYPE_REQ4READABLE = 103;
exports.TYPE_REQ4WRITABLE = 104;
exports.TYPE_REJECT = 105;
exports.TYPE_STREAM_MSG = 106;
exports.TYPE_STREAM_RESOLVE = 107;
exports.TYPE_STREAM_REJECT = 108;
exports.TYPE_ACQUAINT = 200;
exports.TYPE_ROLES = 201;
exports.DATATYPE_BINARY = 0;
exports.DATATYPE_NULL = 1;
exports.DATATYPE_BOOLEAN = 2;
exports.DATATYPE_STRING = 3;
exports.DATATYPE_NUMBER = 4;
exports.DATATYPE_JSON = 5;
exports.STREAM_CHUNK_FLAG = 0;
exports.STREAM_FINISH_FLAG = 1;
exports.STREAM_ERROR_FLAG = 2;
exports.STREAM_BP_QUOTA_FLAG = 3;
exports.PROTOCOL_VERSION = '2.0.0';
//# sourceMappingURL=constants.js.map