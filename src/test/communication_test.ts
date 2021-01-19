import { Peer } from "..";
import * as assert from "assert";
import { Context } from "./../interfaces";
import { createHmac } from "crypto";

const peerA1 = new Peer();
const peerA2 = new Peer();
const peerA3 = new Peer();
const peerA4 = new Peer();
const peerA5 = new Peer();
const peerB = new Peer();
[peerA1, peerA2, peerA3, peerA4, peerA5].forEach((peer) => {
  peer.role("A");
  peer.role("dynamic");
});
peerB.role("B");

describe("communicaion API, consistency of transferred data", () => {
  before(async () => {
    await peerB.listen(0);
    await Promise.all([
      peerA2.connect("ws://localhost:" + peerB._port),
      peerA4.connect("ws://localhost:" + peerB._port),
      peerA3.connect("ws://localhost:" + peerB._port),
      peerA1.connect("ws://localhost:" + peerB._port),
      peerA5.connect("ws://localhost:" + peerB._port),
    ]);
  });
  it("message context for one-way message should contain .unit, .role, .event and .data properties", (done) => {
    let event = "someEvent1";
    peerA1.destination("B").send(event, { a: 1 });
    peerB.role("B").onMessage(event, (ctx) => {
      assert(ctx.unit.id === peerA1.id);
      assert(ctx.event === event);
      assert(ctx.role === "B");
      done();
    });
  });
  it("ctx for response should contain .unit, .data and .rtt properties, ctx for request: .role, .event, .unit, .data", (done) => {
    let event = "someEvent2";
    peerB.role("B").onRequest(event, (ctx, cb) => {
      assert(ctx.role === "B");
      assert(ctx.event === event);
      assert(ctx.unit.id === peerA1.id);
      cb(null, "someData");
    });
    peerA1.destination("B").request(event, { a: 1 }, (err, ctx) => {
      if (err) throw err;
      assert(ctx.data === "someData");
      assert(typeof ctx.rtt === "number");
      assert(ctx.unit.id === peerB.id);
      done();
    });
  });
  it("destination .send() should return a unit or undefined if such is not available", () => {
    assert(peerB.destination("A").send("someMSG", 1)!.id);
    assert(
      typeof peerB.destination("UNREGISTERED_ROLE").send("someMSG", 1) ===
        "undefined"
    );
  });
  it("if requested role is not registered peer should automatically respond with an error", async () => {
    [peerA1, peerA2, peerA3, peerA4, peerA5].forEach((peer) => {
      peer.role("dynamic").onRequest("someReq", (ctx, cb) => {
        cb(null, true);
      });
      peer.role("dynamic").disable();
    });
    assert.rejects(peerB.destination("dynamic").request("someReq", 1));
  });
  it("if request handler for an event is not provided peer should automatically respond with an error", async () => {
    assert.rejects(peerB.destination("A").request("unregistered event", 1));
  });
  it("destination .send(), .request(), .readable() and .writable() with .unit option should communicate with specified unit", (done) => {
    let unit =
      peerB.units[Math.floor(Math.random() * (peerB.units.length - 1))];
    let N = 100;
    let count = 0;
    for (let i = 0; i < N; i++) {
      let sent = peerB.destination("A").send({ event: "Some event", unit }, 0);
      assert(sent === unit);
      count++;
      peerB
        .destination("A")
        .request({ event: "not existing event", unit }, 1, (err, ctx) => {
          assert(err);
          assert(ctx.unit === unit);
          if (--count === 0) {
            done();
          }
        });
    }
  });
  it("binary data should be received as binary", (done) => {
    peerB.role("B").onRequest("echo_binary", (ctx, cb) => {
      assert(Buffer.isBuffer(ctx.data));
      cb(null, Buffer.from([0]));
    });
    peerA1
      .destination("B")
      .request("echo_binary", Buffer.from([1]), (err, ctx) => {
        assert(Buffer.isBuffer(ctx.data));
        done();
      });
  });
  it("null and undefined data should be received as null", (done) => {
    let nothing: null | undefined = null;
    peerB.role("B").onRequest("echo_nothing", (ctx, cb) => {
      assert(ctx.data === null);
      cb(null, ctx.data);
    });
    peerA1.destination("B").request("echo_nothing", nothing, (err, ctx) => {
      assert(ctx.data === nothing);
      nothing = undefined;
      peerA1.destination("B").request("echo_nothing", nothing, (err, ctx) => {
        assert(ctx.data === null);
        done();
      });
    });
  });
  it("string data should be received as string", (done) => {
    let str = "zxcvb.awd awd";
    peerB.role("B").onRequest("echo_string", (ctx, cb) => {
      assert(ctx.data === str);
      cb(null, ctx.data);
    });
    peerA1.destination("B").request("echo_string", str, (err, ctx) => {
      assert(ctx.data === str);
      done();
    });
  });
  it("number data should be received as number", (done) => {
    let num = 123.567;
    peerB.role("B").onRequest("echo_number", (ctx, cb) => {
      assert(ctx.data === num);
      cb(null, ctx.data);
    });
    peerA1.destination("B").request("echo_number", num, (err, ctx) => {
      assert(ctx.data === num);
      num = -10;
      peerA1.destination("B").request("echo_number", num, (err, ctx) => {
        assert(ctx.data === num);
        done();
      });
    });
  });
  it("boolean data should be received as boolean", (done) => {
    let bool = true;
    peerB.role("B").onRequest("echo_boolean", (ctx, cb) => {
      assert(ctx.data === bool);
      cb(null, ctx.data);
    });
    peerA1.destination("B").request("echo_boolean", bool, (err, ctx) => {
      assert(ctx.data === bool);
      bool = false;
      peerA1.destination("B").request("echo_boolean", bool, (err, ctx) => {
        assert(ctx.data === bool);
        done();
      });
    });
  });
  it("object data should be received as object", (done) => {
    let obj = { a: 1, b: [0, undefined, true], c: { d: null, g: "awdawd" } };
    peerB.role("B").onRequest("echo_object", (ctx, cb) => {
      assert.deepEqual(ctx.data, obj);
      cb(null, ctx.data);
    });
    peerA1.destination("B").request("echo_object", obj, (err, ctx) => {
      assert.deepEqual(ctx.data, obj);
      done();
    });
  });
  it(".send should send data to only one connected unit", async () => {
    let i = 0;
    [peerA1, peerA2, peerA3, peerA4, peerA5].forEach((peer) => {
      peer.role("A").onMessage("someEvent22", (ctx) => {
        i++;
      });
    });
    peerB.destination("A").send("someEvent22", 1);
    await new Promise((res) => setTimeout(res, 50));
    assert.equal(i, 1);
  });
  it(".broadcast should send data to all connected units", (done) => {
    let peersA = [peerA1, peerA2, peerA3, peerA4, peerA5];
    let i = 0;
    peersA.forEach((peer) => {
      peer.role("A").onMessage("someMassiveEvent", (ctx) => {
        if (++i === peersA.length) {
          done();
        }
      });
    });
    peerB.destination("A").broadcast("someMassiveEvent", 1);
  });
  it(".request should communicate with only one peer", (done) => {
    const peersA = [peerA1, peerA2, peerA3, peerA4, peerA5];
    let i = 0;
    peersA.forEach((peer) => {
      peer.role("A").onRequest("get_time2", (ctx, cb) => {
        cb(null, Date.now());
        i++;
      });
    });
    peerB.destination("A").request("get_time2", null, (err, ctx) => {
      assert(err === null);
      setTimeout(() => {
        assert.equal(i, 1);
        done();
      }, 50);
    });
  });
  it("parallel .request calls should work independently", (done) => {
    const peersA = [peerA1, peerA2, peerA3, peerA4, peerA5];
    let i = 0;
    peersA.forEach((peer) => {
      peer.role("A").onRequest("get_time3", (ctx, cb) => {
        setTimeout(() => cb(null, Date.now()), 100);
      });
      peerB
        .destination("A")
        .request(
          {
            unit: peerB.units.find((unit) => unit.id === peer.id),
            event: "get_time3",
          },
          null,
          (err, ctx) => {
            assert(err === null);
            assert(typeof ctx.data === "number");
            i++;
            if (i === peersA.length - 1) done();
          }
        );
    });
  });
  it(".survey should request all connected units", (done) => {
    const peersA = [peerA1, peerA2, peerA3, peerA4, peerA5];
    peersA.forEach((peer) => {
      peer.role("A").onRequest("get_time", (ctx, cb) => {
        cb(null, Date.now());
      });
    });
    let i = 0;
    peerB.destination("A").survey("get_time", null, (err, ctx) => {
      assert(err === null);
      if (++i === peersA.length) done();
    });
  });
  it("testing .writable", (done) => {
    let hmacOnEmitter = createHmac("SHA256", "some key");
    let hmacOnreceiver = createHmac("SHA256", "some key");
    peerA1.role("A").onReadable("a1", (ctx, cb) => {
      let readable = ctx.readable;
      readable.on("data", (data) => {
        hmacOnreceiver.update(data);
      });
      cb(null, "awd");
      readable.on("end", () => {
        let emitted = hmacOnEmitter.digest("hex");
        let received = hmacOnreceiver.digest("hex");
        assert.equal(emitted, received);
        assert(ready);
        done();
      });
    });
    let ready = false;
    let writable = peerB
      .destination("A")
      .Writable(
        {
          event: "a1",
          unit: peerB.units.find((unit) => unit.id === peerA1.id),
        },
        "awd"
      );
    writable.on("ready", (ctx) => {
      assert(ctx.data === "awd");
      ready = true;
    });
    let N = 1000;
    for (let i = 0; i < N; i++) {
      let chunk = Buffer.from(
        i % 100 === 0 ? "" : Math.random().toString(36).substring(2, 15)
      );
      hmacOnEmitter.update(chunk);
      writable.write(chunk);
    }
    writable.end();
  });
  it("testing .readable", (done) => {
    let hmacOnEmitter = createHmac("SHA256", "some key");
    let hmacOnreceiver = createHmac("SHA256", "some key");
    peerA1.role("A").onWritable("a2", (ctx, cb) => {
      cb(null, 5);
      let writable = ctx.writable;
      let N = 1000;
      for (let i = 0; i < N; i++) {
        let chunk = Buffer.from(
          i % 100 === 0 ? "" : Math.random().toString(36).substring(2, 15)
        );
        hmacOnEmitter.update(chunk);
        writable.write(chunk);
      }
      writable.end();
    });
    let readable = peerB
      .destination("A")
      .Readable(
        {
          event: "a2",
          unit: peerB.units.find((unit) => unit.id === peerA1.id),
        },
        null
      );
    let ready = false;
    readable.on("ready", (ctx) => {
      ready = true;
      assert(ctx.data === 5);
    });
    readable.on("data", (data) => {
      hmacOnreceiver.update(data);
    });
    readable.on("end", () => {
      let emitted = hmacOnEmitter.digest("hex");
      let received = hmacOnreceiver.digest("hex");
      assert.equal(emitted, received);
      assert(ready);
      done();
    });
  });
  it("middleware should apply from more common to more specific direction", (done) => {
    peerA1
      .destination("B")
      .request("count mw", 1)
      .then((ctx) => {
        assert.equal(ctx.data, "123454321");
        done();
      });
    peerB.role("B").onRequest("count mw", (ctx, cb) => {
      cb(null, ctx.response + "5");
    });
    peerB.onData(async (ctx: Context) => {
      ctx.response = "1";
      await ctx.next!();
      ctx.response += "1";
    });
    peerB.onRequest(async (ctx: Context, cb) => {
      ctx.response += "2";
      ctx.next!().then(() => {
        ctx.response += "2";
      });
    });
    peerB.role("B").onData(async (ctx: Context) => {
      ctx.response += "3";
      await ctx.next!();
      ctx.response += "3";
    });
    peerB.role("B").onRequest(async (ctx: Context, cb) => {
      ctx.response += "4";
      await ctx.next!();
      ctx.response += "4";
    });
  });
  after(async () => {
    [peerB, peerA1, peerA2, peerA3, peerA4, peerA5].forEach((peer) =>
      peer.close()
    );
  });
});
