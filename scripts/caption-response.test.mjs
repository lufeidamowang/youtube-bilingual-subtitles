import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { buildResponseModule } from './build-shadowrocket.mjs';

const root = process.env.YTB_PROJECT_ROOT;
const script = await readFile(path.join(root, 'dist/caption-response.js'), 'utf8');
const xml = (text, start=1000) => `<timedtext format="3"><body><p t="${start}" d="2000">${text}</p></body></timedtext>`;
const host = fields => Object.defineProperties({}, Object.fromEntries(Object.entries(fields).map(([key,value]) => [key,{value,writable:true,enumerable:false}])));

async function run({ original=xml('こんにちは'), translated=xml('你好'), lang='ja', status=200, query='', mime='text/xml', internal=false, diagnostic=false, validCookies=true, nativeHeaders=false, existingCookie=false }={}) {
  const requests=[], posts=[], storage={};
  let finish;
  const complete=new Promise(resolve=>{finish=resolve;});
  const context=vm.createContext({
    URL:undefined,URLSearchParams:undefined,TextEncoder:undefined,TextDecoder:undefined,
    setTimeout,clearTimeout,console:{log(){},error(){},warn(){}},
    $rocket:'fixture',$argument:`TargetLanguage=zh-Hans&Diagnostic=${diagnostic}`,
    $request:host({url:`https://www.youtube.com/api/timedtext?v=fixture&lang=${lang}&signature=fixture-signature${query}`,headers:internal?{'X-YTB-Internal':'1'}:existingCookie?host({Cookie:'fixture-current-cookie','User-Agent':'fixture Safari'}):{Authorization:'fixture-original-auth'}}),
    $response:host({status:200,headers:nativeHeaders?host({'Content-Type':mime,'Content-Length':'999','ETag':'fixture'}):{'Content-Type':mime,'Content-Length':'999','ETag':'fixture'},body:original}),
    $persistentStore:{read:key=>storage[key]||null,write:(value,key)=>{storage[key]=value;return true;}},
    $httpClient:{
      get:(options,callback)=>{
        requests.push(options);
        const url=new URL(options.url);
        if(url.pathname==='/sw.js') {
          const expiry=new Date(Date.now()+86400000).toUTCString();
          const names=validCookies?['YSC','VISITOR_INFO1_LIVE','VISITOR_PRIVACY_METADATA','__Secure-ROLLOUT_TOKEN']:['YSC'];
          const headers={'Set-Cookie':names.map(name=>`${name}=fixture; Expires=${expiry}; Path=/; Secure`).join(', ')};
          callback(null,{status:200,headers:nativeHeaders?host(headers):headers},'');
        } else callback(null,{status,headers:{'Content-Type':mime}},translated);
      },
      post:(options,callback)=>{posts.push(JSON.parse(options.body));callback(null,{status:204},'');},
    },
    $done:value=>finish(JSON.parse(JSON.stringify(value))),
  });
  vm.runInContext(script,context,{timeout:3000});
  let timer;
  try {
    const result=await Promise.race([complete,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('caption handler did not finish')),3000);})]);
    return {result,requests,posts};
  } finally {clearTimeout(timer);}
}

test('Japanese XML produces original plus Chinese and preserves timing',async()=>{
  const {result,requests}=await run();
  assert.match(result.body,/こんにちは\n你好/);
  assert.match(result.body,/t="1000" d="2000"/);
  assert.equal(result.headers['Cache-Control'],'no-store');
  assert.equal(result.headers['Content-Length'],undefined);
  const request=requests.find(item=>new URL(item.url).pathname==='/api/timedtext');
  assert.equal(new URL(request.url).searchParams.get('lang'),'ja');
  assert.equal(new URL(request.url).searchParams.get('tlang'),'zh-Hans');
  assert.equal(new URL(request.url).searchParams.get('signature'),'fixture-signature');
  assert.equal(request.headers.Authorization,undefined);
  assert.ok(requests.every(item => item['auto-cookie'] === false));
});

test('Korean JSON captions merge without losing source segments or timing',async()=>{
  const original=JSON.stringify({events:[{tStartMs:1000,dDurationMs:2000,segs:[{utf8:'안녕'},{utf8:'하세요'}]}]});
  const translated=JSON.stringify({events:[{tStartMs:1000,dDurationMs:2000,segs:[{utf8:'你好'}]}]});
  const {result}=await run({original,translated,lang:'ko',mime:'application/json'});
  const cue=JSON.parse(result.body).events[0];
  assert.equal(cue.segs[0].utf8,'안녕하세요\n你好');
  assert.equal(cue.tStartMs,1000);assert.equal(cue.dDurationMs,2000);
});

test('automatic-caption spans and XML entities remain readable',async()=>{
  const {result}=await run({original:xml('<s>Hello &amp; </s><s>goodbye</s>'),translated:xml('你好，再见'),lang:'en',query:'&kind=asr'});
  assert.match(result.body,/Hello &amp; goodbye\n你好，再见/);
});

test('Chinese and explicitly translated tracks pass through without network calls',async()=>{
  for(const options of [{lang:'zh-Hans'},{query:'&tlang=zh-Hans'}]) {
    const {result,requests}=await run(options);assert.deepEqual(result,{});assert.equal(requests.length,0);
  }
});

test('internal fetches cannot recursively translate themselves',async()=>{
  const {result,requests}=await run({internal:true});assert.deepEqual(result,{});assert.equal(requests.length,0);
});

test('translation failure and missing alignment preserve the original response',async()=>{
  for(const options of [{status:429},{translated:''},{translated:xml('你好',9000)}]) {
    const {result}=await run(options);assert.deepEqual(result,{});
  }
});

test('public translation remains available without browser cookies',async()=>{
  const {result,requests}=await run({validCookies:false});assert.match(result.body,/こんにちは\n你好/);assert.equal(requests.length,1);
  assert.equal(requests[0].headers.Cookie,undefined);
});

test('release never sends telemetry even if Diagnostic is requested',async()=>{
  const {posts}=await run({diagnostic:true}); assert.deepEqual(posts,[]);
});

test('response-only module does not install competing request rules',()=>{
  const module=buildResponseModule('http://192.0.2.1/');
  assert.equal((module.match(/type=http-response/g)||[]).length,1);
  assert.ok(!module.includes('type=http-request'));
  assert.ok(!module.includes('youtubei.googleapis.com'));
  assert.ok(!module.includes('[Proxy]')&&!module.includes('[Rule]'));
});

test('native non-enumerable headers preserve caption MIME',async()=>{
  const {result}=await run({nativeHeaders:true});
  assert.equal(typeof result.body,'string');
  assert.match(result.body,/こんにちは\n你好/);
  assert.equal(result.headers['Content-Type'],'text/xml');
});

test('an existing same-origin caption session does not request a replacement cookie',async()=>{
  const {result,requests}=await run({existingCookie:true,diagnostic:true});
  assert.match(result.body,/こんにちは\n你好/);
  assert.equal(requests.length,1);
  assert.equal(requests[0].headers.Cookie,'fixture-current-cookie');
  assert.equal(requests[0].headers['User-Agent'],'fixture Safari');
});
