# API Reference for Roletalk-JS

## Overview

This API is generated directly from [project](https://github.com/xshkut/roletalk-js)'s source with [TypeDoc](https://typedoc.org)

Due to development process of TypeDoc, overriden events are not visible unless you fill "Inherited" checkbox, then see `on` methods on classes to check available typed events.

Some basic examples will be added soon... 

## Examples

### Connection and authentication

``` 
//import is common for all files

import { Peer } from 'roletalk'

//file Bob.ts

let bob = new Peer({ name: 'Bob' })
//We can add multiple preshared keys.
bob.addPresharedKey('supersecret', 'qwerty456')
bob.addPresharedKey('some_other', 'qwerty123')

bob.on('unit', (unit) => {
    console.log( `Unit connected to Bob: ${unit.name}` )
})

setTimeout(() => {
    console.log( `Bob connected to next units: ${bob.units.map(unit => unit.name)}` )
}, 1000)

bob.listen(9000)

//file Alice.ts

let alice = new Peer({ name: 'Alice' })
alice.addPresharedKey('supersecret', 'qwerty456')
alice.addPresharedKey('one_another', 'qwerty789')

alice.on('unit', (unit) => {
    console.log( `Unit connected to Alice: ${unit.name}` )
})

alice.connect('ws://localhost:9000')

//file Chuck.ts

let chuck = new Peer({ name: 'Chuck' })
chuck.addPresharedKey('supersecret', 'maybe_12345?')

chuck.connect('ws://localhost:9000').catch(err => console.log( `Chuck cannot connect to Bob: ${err}` ))

//file Carlos.ts

let carlos = new Peer({ name: 'Carlos' })
//Lets try to connect to Bob without keys at all
carlos.connect('ws://localhost:9000').catch(err => console.log( `Carlos cannot connect to Bob: ${err}` ))
```

Output:

``` 
Carlos cannot connect to Bob: Verification error: The peer has not such proofs: supersecret,some_other
Unit connected to Alice: Bob
Chuck cannot connect to Bob: Auth error: Preshared key mismatch. Chosen id: supersecret
Unit connected to Bob: Alice
Bob connected to next units: Alice
```

## RPC with middleware

```
import { Peer } from 'roletalk'
import { randomBytes } from 'crypto'

let wrapper1 = new Peer({ name: 'Wrapper 1' })
let wrapper2 = new Peer({ name: 'Wrapper 2' })
let wrapper3 = new Peer({ name: 'Wrapper 3' })
let wrapper4 = new Peer({ name: 'Wrapper 4' })
let sender = new Peer()

sender.listen(9000)
let wrappers = [wrapper1, wrapper2, wrapper3, wrapper4]

for (let wrapper of wrappers) {
    wrapper.connect('ws://localhost:9000')

    let i = 0;

    //Handling all incoming requests for all roles and events to increment counter
    wrapper.onRequest(async (ctx) => {
        i++;
    })

    //Stringigying responses for all events
    wrapper.role('json-wrapper').onRequest(async (ctx) => {
        // Waiting for response to stringify it...
        await ctx.next!()
        ctx.response = JSON.stringify(ctx.response)
    })

    //Wrapping data
    wrapper.role('json-wrapper').onRequest('wrap', (ctx, cb) => {
        cb(null, { total_order: i, data: ctx.data, by: wrapper.name })
    })
}

setInterval(async () => {
    try {
        let data = randomBytes(10).toString('hex')
        let ctx = await sender.destination('json-wrapper').request('wrap', data)
        console.log(`${data} wrapped to ${ctx.data}`)
    }
    catch (err) {
        //...
    }

}, 1000)
```

Output:

``` 
7ea03d3339a59d7b6fd1 wrapped to {"total_order":1,"data":"7ea03d3339a59d7b6fd1","by":"Wrapper 1"}
0fbf880c5010372ad6e2 wrapped to {"total_order":1,"data":"0fbf880c5010372ad6e2","by":"Wrapper 2"}
edcfebf32574bbf9dfe9 wrapped to {"total_order":1,"data":"edcfebf32574bbf9dfe9","by":"Wrapper 3"}
65284dfd7fbfe88f3fa2 wrapped to {"total_order":1,"data":"65284dfd7fbfe88f3fa2","by":"Wrapper 4"}
2838ac705a7b00a4baa3 wrapped to {"total_order":2,"data":"2838ac705a7b00a4baa3","by":"Wrapper 1"}
32274132938f6e8227bd wrapped to {"total_order":2,"data":"32274132938f6e8227bd","by":"Wrapper 2"}
a4cc0784da453df58ccb wrapped to {"total_order":2,"data":"a4cc0784da453df58ccb","by":"Wrapper 3"}
22f9f79cdad13d32079f wrapped to {"total_order":2,"data":"22f9f79cdad13d32079f","by":"Wrapper 4"}
06c41164f30ec96f399c wrapped to {"total_order":3,"data":"06c41164f30ec96f399c","by":"Wrapper 1"}
06556695174afdfd12a2 wrapped to {"total_order":3,"data":"06556695174afdfd12a2","by":"Wrapper 2"}
```

## Publish-Subscribe

``` 
import { Peer } from 'roletalk'

//Declare publisher and subscribers
let pub = new Peer({ name: 'Bob' }),
    sub1 = new Peer({ name: "Alice" }),
    sub2 = new Peer({ name: "Anna" }),
    sub3 = new Peer({ name: "Kate" })

let subs = [sub1, sub2, sub3];

let port = 9000

//Now let's connect them together. It doesn't matter who listens and who connects.
//For example, publisher will be the listener
pub.listen(port)
subs.forEach(async (sub: Peer) => {
    try {
        //Connect subscribers to publisher
        let connected = await sub.connect('ws://localhost:' + port)
        console.log( `${sub.name} connected to ${connected.unit.name}` )
    } catch (err) {
        console.log( `Cannot connect to Bob due to error: ${err}` )
    }
});

//Declare Role and handler for event
subs.forEach(async (sub: Peer) => {
    sub.role('time_receiver').onMessage('now', (ctx) => {
        let now = new Date(ctx.data).toTimeString()
        console.log( `This is ${sub.name}. ${ctx.unit.name} told me current time: ${now}` )
        //maybe rate his work?
        if (Math.random() > 0.9) {
            let rate = Math.ceil(Math.random() * 5 + 5)
            sub.destination('time_emitter').send({ unit: ctx.unit, event: 'rate' }, rate)
        }
    })
});

pub.role('time_emitter').onMessage('rate', (ctx) => {
    console.log( `${ctx.unit.name} has rated my work: ${ctx.data}` )
})
Peer.name
setInterval(() => {
    pub.destination('time_receiver').broadcast('now', Date.now())
}, 1000)
```

Output: 

``` 
This is Alice. Bob told me current time: 18:55:33 GMT+0200 (GMT+02:00)
This is Anna. Bob told me current time: 18:55:33 GMT+0200 (GMT+02:00)
This is Kate. Bob told me current time: 18:55:33 GMT+0200 (GMT+02:00)
This is Alice. Bob told me current time: 18:55:34 GMT+0200 (GMT+02:00)
This is Anna. Bob told me current time: 18:55:34 GMT+0200 (GMT+02:00)
This is Kate. Bob told me current time: 18:55:34 GMT+0200 (GMT+02:00)
Anna has rated my work: 9
This is Alice. Bob told me current time: 18:55:35 GMT+0200 (GMT+02:00)
This is Anna. Bob told me current time: 18:55:35 GMT+0200 (GMT+02:00)
This is Kate. Bob told me current time: 18:55:35 GMT+0200 (GMT+02:00)
Kate has rated my work: 8
```

