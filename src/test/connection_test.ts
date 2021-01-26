import { Peer } from "..";
import * as assert from "assert";
import { createServer, Server } from "http";

const peer1 = new Peer({ name: "PEER 1" });
peer1.setTag("some_id", "123")
peer1.setTag("some_id", "456")
peer1.setTag("abc", "def")
peer1.auth.addPresharedKey("foo", "111222333"); //id mismatch
peer1.auth.addPresharedKey("bar", "444555666"); //id and key match
const peer2 = new Peer({ name: "PEER 2" });
peer2.auth.addPresharedKey("bar", "444555666"); //id and key match
peer2.auth.addPresharedKey("baz", "qwerty789"); //id mismatch
const peer3 = new Peer();
peer3.auth.addPresharedKey("quux", "111222333"); //id mismatch
peer3.auth.addPresharedKey("bat", "444555666"); //id mismatch
const peer4 = new Peer();
peer4.auth.addPresharedKey("bar", "qwerty000"); //key mismatch
const peer5 = new Peer({ name: "PEER 5" });
peer5.auth.addPresharedKey("foo", "111222333"); //match with peer1
peer5.auth.addPresharedKey("bar", "444555666"); //match with peer2
const someRole1 = "someRole1";
const someRole2 = "someRole2";
const someRole3 = "someRole3";
peer1.role(someRole1);
peer1.destination(someRole2);
peer2.role(someRole2);
peer2.role(someRole3);
peer2.destination(someRole1);
peer5.destination(someRole2);
describe("connection behaviour, authentication, roles detection, reconnection and service discovery", () => {
  before(async () => {
    await peer1.listen({ port: 0 });
    await peer2.listen({ port: 0 });
  });
  it("Peers with preshared id & keys match should establish connection successfully", () => {
    return peer1.connect("ws://localhost:" + peer2._port);
  });
  it("Peers with id mismatch should fail handshake", () => {
    assert.rejects(peer3.connect("ws://localhost:" + peer2._port));
  });
  it("Peers with id match but not equality should fail handshake", () => {
    assert.rejects(peer4.connect("ws://localhost:" + peer2._port));
  });
  it("Corresponding id and name of peer and unit should match", () => {
    assert(peer1.id === peer2.units[0].id);
    assert(peer1.name === peer2.units[0]._name);
    assert(typeof peer1.id === "string");
    assert(typeof peer1.name === "string");
  });
  it("Peer's tags should be equal on both ends of the connection", () => {
    assert.deepStrictEqual(peer1.getTags(), peer2.units[0].getTags())
    assert.deepStrictEqual(peer1.getTags(), { some_id: "456", abc: "def" })
  });
  it("listening with port number should start HTTP server", () => {
    assert(peer1._listener! instanceof Server);
  });
  it("error when listening should reject a promise", () => {
    assert.rejects(peer3.listen(peer1._port!));
  });
  it("trying to listen when already listening should throw an error", () => {
    assert.throws(() => peer1.listen(0));
  });
  it("connect(address) should create a unit", () => {
    assert(peer1.units.length === 1);
    assert(peer2.units.length === 1);
    assert(peer3.units.length === 0);
  });
  it("connected units with roles should not create new destinations on the peer", () => {
    assert(!peer1.destinations.map((dest) => dest.name).includes(someRole3));
  });
  it("connected units should be included into corresponding destinations", () => {
    assert(peer1.destination(someRole2).units.length > 0);
    assert(peer2.destination(someRole1).units.length > 0);
    assert(peer2.destination(someRole3).units.length === 0);
  });
  it("destinations without corresponding roles on units should not be ready", () => {
    assert(peer1.destination("someUnregisteredRole").units.length === 0);
    assert(peer1.destination("someUnregisteredRole").ready === false);
  });
  it("creating new role should open corresponding destination on units", (done) => {
    peer1.role("someNewRole");
    peer2.destination("someNewRole").once("open", done);
  });
  it("Closed websocket should cause reconnection", async () => {
    let unit = peer1.units[0]!;
    let ws = unit._sockets[0];
    ws.close(1012);
    await new Promise((res) => ws.once("close", res));
    assert.strictEqual(peer1.units.length, 0);
    await new Promise((res) => peer1.once("unit", res));
    assert.strictEqual(peer1.units.length, 1);
  });
  it("Intentionally closed unit from the socket server's side should cause reconnection", async () => {
    let unit = peer2.units[0]!;
    let ws = unit._sockets[0];
    unit.close();
    await new Promise((res) => ws.once("close", res));
    assert.strictEqual(peer2.units.length, 0);
    await new Promise((res) => peer2.once("unit", res));
    assert.strictEqual(peer2.units.length, 1);
  });
  it("Intentionally closed unit from the socket client's side should prevent reconnection", async () => {
    let unit = peer1.units[0]!;
    let ws = unit._sockets[0];
    unit.close();
    await new Promise((res) => ws.once("close", res));
    assert(peer1.units.length === 0);
    await new Promise((res) => setTimeout(res, 50));
    assert(peer1.units.length === 0);
  });
  it("Disconnected units should left corresponding destinations", () => {
    assert(peer1.destination(someRole2).units.length === 0);
    assert(peer2.destination(someRole1).units.length === 0);
  });
  it("Connected peer should be aqcuaited with another one connected earlier to that peer", async () => {
    await peer1.connect("ws://localhost:" + peer2._port);
    await peer5.connect("ws://localhost:" + peer1._port);
    await new Promise((res) => peer5.once("unit", res));
    assert(peer5.units.map((unit) => unit.id).includes(peer2.id));
  });
  after(() => {
    peer1.close();
    peer2.close();
    peer5.close();
  });
});

describe("manual websocket handling", () => {
  const peer1 = new Peer()
  const peer2 = new Peer()
  const server = createServer(() => { })
  before((cb) => {
    peer1.prepareWSServer()
    server.listen({ host: "localhost", port: 0 }, cb)
    server.on("upgrade", (request, socket, head) => {
      peer1.handleUpgrade(request, socket, head)
    })
  })
  it("a connection should be established to the roletalk instance attached to a server", async () => {
    await assert.doesNotReject(peer2.connect("ws://localhost:" + (server.address() as { port: number }).port));
    await assert.deepStrictEqual(peer2.units.map(u => u.id), [peer1.id])
  })
  after(() => {
    peer1.close()
    peer2.close()
    server.close()
  })
})
