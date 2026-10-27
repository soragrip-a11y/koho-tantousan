import test from 'node:test';import assert from 'node:assert/strict';
import {readDemoPhoto,validDemoPhoto} from '../dist/demo/stores/demo-photo.js';
import {createDemo,initialDraft} from '../dist/demo/stores/staff-demo-model.js';
test('demo photo validates type/size, bounds dimensions, closes bitmap and keeps only JPEG memory',async()=>{
 let closed=0,drawn=0;const canvas={getContext:()=>({drawImage:()=>drawn++}),toDataURL:()=>'data:image/jpeg;base64,YQ=='};
 const deps={decode:async()=>({width:1920,height:1080,close:()=>closed++}),canvas:()=>canvas};
 const image=await readDemoPhoto({type:'image/jpeg',size:100},deps);assert.equal(canvas.width,960);assert.equal(canvas.height,540);assert.equal(closed,1);assert.equal(drawn,1);assert.ok(validDemoPhoto(image));
 for(const file of [{type:'image/svg+xml',size:1},{type:'image/jpeg',size:0},{type:'image/png',size:11*1024*1024}])await assert.rejects(readDemoPhoto(file,deps));
 await assert.rejects(readDemoPhoto({type:'image/jpeg',size:10},{...deps,decode:async()=>({width:10000,height:10000,close:()=>closed++})}));assert.equal(closed,2);
 const demo=createDemo();demo.save({...initialDraft(),photo:'local',title:'Test',text:'Synthetic',image});assert.equal(demo.list()[0].image,image);demo.reset();assert.deepEqual(demo.list(),[]);
 assert.throws(()=>demo.save({...initialDraft(),photo:'local',image:'https://example.invalid/private'}));
});
