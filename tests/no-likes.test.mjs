import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
test('removed likes has no residual state, requests, UI or modules',()=>{
for(const name of ['customer.js','app.js','index.html','staff.html','staff-demo.js']){const s=fs.readFileSync(new URL('../dist/demo/stores/'+name,import.meta.url),'utf8');assert.doesNotMatch(s,/likeError|data-like|likes\.|likeCount|notice-likes|koho_\w*like|staff-heart|createNoticeLikes|likeMarkup/);}
for(const n of ['notice-likes.js','notice-likes.css'])assert.equal(fs.existsSync(new URL('../dist/demo/stores/'+n,import.meta.url)),false);
});
