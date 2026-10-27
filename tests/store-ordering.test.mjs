import test from 'node:test';
import assert from 'node:assert/strict';
import {publicPosts,staffPosts,lifecycle} from '../dist/demo/stores/schedule.js';
import {createDemo} from '../dist/demo/stores/staff-demo-model.js';
const date=n=>new Date(n).toISOString();
const post=(id,created,state='active',extra={})=>({id,publishedAt:date(created),state,end:null,...extra});
test('demo records latest publication and matches real republication semantics',()=>{
 let now=100;const demo=createDemo({now:()=>now});const draft={title:'Fixture',text:'Synthetic',photo:'local',image:'data:image/jpeg;base64,YQ==',start:null,end:null};
 const first=demo.save(draft);now=200;const second=demo.save(draft);
 assert.deepEqual(publicPosts(demo.list(),300).map(p=>p.id),[second.id,first.id]);
 now=400;demo.save(draft,first.id);
 assert.deepEqual(publicPosts(demo.list(),500).map(p=>p.id),[first.id,second.id]);
 demo.end(first.id);assert.deepEqual(staffPosts(demo.list(),500).map(p=>p.id),[second.id,first.id]);
});
test('live precedes newer ended; latest posting time wins over schedule time',()=>{
 const rows=[post('ended',900,'ended'),post('older',100,'active',{start:date(40)}),post('newer',200,'active',{start:date(20)})];
 assert.deepEqual(publicPosts(rows,1000).map(p=>p.id),['newer','older','ended']);
 assert.deepEqual(rows.map(p=>p.id),['ended','older','newer']);
});
test('clock boundaries reorder, unlimited stays live, manual end is retained',()=>{
 const rows=[post('timed',300,'active',{start:date(500),end:date(1000)}),post('unlimited',100),post('manual',400,'soldout')];
 assert.deepEqual(publicPosts(rows,499).map(p=>p.id),['unlimited','manual']);
 assert.deepEqual(publicPosts(rows,500).map(p=>p.id),['timed','unlimited','manual']);
 assert.deepEqual(publicPosts(rows,1000).map(p=>p.id),['unlimited','manual','timed']);
 assert.equal(lifecycle(rows[1],1e12),'active');
});
test('staff keeps scheduled and nonpublic records; equal dates use stable IDs; missing legacy dates preserve source order',()=>{
 const rows=[post('ended',500,'ended'),post('scheduled',400,'active',{start:date(2000)}),post('b',100),post('a',100),post('removed',700,'withdrawn')];
 assert.deepEqual(staffPosts(rows,1000).map(p=>p.id),['a','b','scheduled','ended','removed']);
 const legacy=[{id:'z',state:'active',end:date(2000)},{id:'a',state:'active',end:null}];
 assert.deepEqual(publicPosts(legacy,1000).map(p=>p.id),['z','a']);
 assert.equal(legacy[0].end,date(2000));
});
