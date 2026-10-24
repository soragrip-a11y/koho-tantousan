import test from 'node:test';
import assert from 'node:assert/strict';
import {seed,status,validate,LocalRepository} from '../dist/demo/stores/model.js';
test('deadlines are exclusive and terminal states remain separate',()=>{const x=seed(0)[0];assert.equal(status(x,86399999),'active');assert.equal(status(x,86400000),'ended');for(const state of ['soldout','hidden','ended'])assert.equal(status({...x,state},86400001),state);});
test('independent notices, persistent edits and reset',()=>{let raw=null;const repo=new LocalRepository({getItem:()=>raw,setItem:(_,v)=>raw=v,removeItem:()=>raw=null});const a=repo.load();a[0].state='soldout';repo.save(a);assert.equal(repo.load()[0].state,'soldout');assert.equal(repo.load()[1].state,'active');assert.equal(repo.reset()[0].state,'active');});
test('empty text, excessive text and invalid date cannot be stored',()=>{const x=seed()[0];for(const change of [{title:' '},{text:' '},{title:'あ'.repeat(41)},{text:'あ'.repeat(181)},{end:'bad'}])assert.throws(()=>validate({...x,...change}));assert.equal(validate({...x,title:'あ'.repeat(40),text:'あ'.repeat(180)}).title.length,40);});
test('storage corruption and failure are surfaced, not falsely acknowledged',()=>{assert.throws(()=>new LocalRepository({getItem:()=>'{'}).load());assert.throws(()=>new LocalRepository({setItem:()=>{throw Error('quota')}}).save(seed()));});
