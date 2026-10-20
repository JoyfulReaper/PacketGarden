// Optional real ASP.NET integration; no dependencies or public network services.
// Build PacketGarden, then: node tests/weather-sse.cjs --run path/to/PacketGarden.dll
if (!process.argv.includes('--run')) console.log('SKIP: weather SSE host integration; pass --run and a built PacketGarden.dll.');
else run().catch(error => { console.error(error); process.exitCode = 1; });

async function run() {
  const assert = require('node:assert/strict'), http = require('node:http'), path = require('node:path');
  const {spawn} = require('node:child_process');
  const assembly = process.argv[process.argv.indexOf('--run')+1];
  assert(assembly, 'Pass the built PacketGarden.dll after --run');
  let snapshot = {level:'rain',eventsPerMinute:29.8,eventsLastFiveMinutes:149,eventsLastHour:4321};
  let unavailable = false, firstRequest, requests = 0, logs = '';
  const snapshotServer = http.createServer((req,res) => {
    requests++;
    if (requests === 1) { firstRequest = res; return; } // Expose startup fallback before releasing first fetch.
    res.writeHead(unavailable ? 503 : 200, {'Content-Type':'application/json'});
    res.end(JSON.stringify(snapshot));
  });
  await new Promise(resolve => snapshotServer.listen(0,'127.0.0.1',resolve));
  const portReservation = http.createServer();
  await new Promise(resolve => portReservation.listen(0,'127.0.0.1',resolve));
  const port = portReservation.address().port;
  await new Promise(resolve => portReservation.close(resolve));
  const host = spawn('dotnet',[path.resolve(assembly),'--urls',`http://127.0.0.1:${port}`], {
    cwd:path.resolve(__dirname,'..'), windowsHide:true,
    env:{...process.env,Nats__Url:'',Weather__SnapshotUrl:`http://127.0.0.1:${snapshotServer.address().port}/api/snapshot`}
  });
  host.stdout.on('data', data => { logs += data; }); host.stderr.on('data',data => { logs += data; });
  host.on('error',error => { logs += error.stack; });
  const controllers = [];
  async function waitFor(predicate) {
    const deadline = Date.now()+15000;
    while (!predicate()) {
      assert(host.exitCode === null, `Host exited: ${logs}`);
      assert(Date.now() < deadline, `Timed out waiting for host: ${logs}`);
      await new Promise(resolve => setTimeout(resolve,25));
    }
  }
  async function openStream() {
    const controller = new AbortController(); controllers.push(controller);
    const response = await fetch(`http://127.0.0.1:${port}/api/garden/events`,{signal:controller.signal});
    assert.equal(response.status,200); assert.match(response.headers.get('content-type'),/text\/event-stream/);
    const reader = response.body.getReader(), decoder = new TextDecoder(); let pending = '';
    return async () => {
      while (!pending.includes('\n\n')) {
        const part = await reader.read(); assert(!part.done, 'Unexpected SSE termination'); pending += decoder.decode(part.value,{stream:true});
      }
      const end = pending.indexOf('\n\n'), frame = pending.slice(0,end); pending = pending.slice(end+2);
      assert.match(frame,/^event: weather\n/); return JSON.parse(frame.slice(frame.indexOf('data: ')+6));
    };
  }
  async function next(read) {
    let timer;
    try {
      return await Promise.race([read(), new Promise((_,reject) => {
        timer = setTimeout(() => reject(new Error(`Weather update timed out: ${logs}`)),15000);
      })]);
    } finally { clearTimeout(timer); }
  }
  try {
    await waitFor(() => logs.includes('Now listening on:') && firstRequest);
    const read = await openStream();
    assert.deepEqual(await next(read),{level:'quiet',eventsPerMinute:0,eventsLastHour:null,hasSnapshot:false});
    firstRequest.writeHead(200,{'Content-Type':'application/json'}); firstRequest.end(JSON.stringify(snapshot));
    assert.deepEqual(await next(read),{level:'rain',eventsPerMinute:29.8,eventsLastHour:4321,hasSnapshot:true});
    snapshot = {...snapshot,eventsLastHour:4322};
    assert.deepEqual(await next(read),{level:'rain',eventsPerMinute:29.8,eventsLastHour:4322,hasSnapshot:true},'hour alone wakes the actual SSE pump');
    unavailable = true;
    await waitFor(() => logs.includes('Weather snapshot unavailable; retaining last valid state.'));
    const reconnected = await openStream();
    assert.deepEqual(await next(reconnected),{level:'rain',eventsPerMinute:29.8,eventsLastHour:4322,hasSnapshot:true},'failure/reconnection retains entire valid state');
    unavailable = false; snapshot = {level:'rain',eventsPerMinute:29.8};
    assert.deepEqual(await next(read),{level:'rain',eventsPerMinute:29.8,eventsLastHour:null,hasSnapshot:true},'older snapshot recovers with unavailable hour');
    assert.deepEqual(await next(reconnected),{level:'rain',eventsPerMinute:29.8,eventsLastHour:null,hasSnapshot:true});
    await waitFor(() => logs.includes('Weather snapshot polling recovered.'));
    console.log('PASS: actual ASP.NET polling -> normalized SSE, startup unavailable, source hour, hourly-only update, outage retention, immediate reconnect and older-source recovery.');
  } finally {
    for (const controller of controllers) controller.abort();
    host.kill(); snapshotServer.closeAllConnections(); await new Promise(resolve => snapshotServer.close(resolve));
  }
}
