import test from 'node:test';
import assert from 'node:assert/strict';
import {noticeMedia} from '../dist/demo/stores/notice-view.js';
test('photo-less notices have no placeholder; manual end retains compact text status',()=>{
 for(const state of ['active','scheduled','withdrawn','deleting'])assert.equal(noticeMedia({image:''},state),'');
 assert.match(noticeMedia({image:''},'ended'),/終了しました/);
 const ended=noticeMedia({image:''},'soldout');assert.match(ended,/no-photo/);assert.match(ended,/終了しました/);assert.doesNotMatch(ended,/<img|placeholder/);
 const photo=noticeMedia({image:'data:image/jpeg;base64,YQ=='},'soldout');assert.match(photo,/<img/);assert.match(photo,/soldout-cover/);assert.doesNotMatch(photo,/no-photo/);
});
