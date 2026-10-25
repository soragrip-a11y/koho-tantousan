import test from 'node:test';
import assert from 'node:assert/strict';
import {consumeRecoveryLink,RECOVERY_URL} from '../dist/demo/stores/password-recovery-ui.js';
test('recovery consumes credentials before rendering and rejects non-recovery links',()=>{
 let cleared;const history={replaceState:(_,__,value)=>cleared=value};
 const parse=(hash,search='')=>consumeRecoveryLink({hash,search,pathname:'/password-recovery.html'},history);
 assert.equal(parse(''),null);assert.equal(parse('','?v=15'),null);
 assert.deepEqual(parse('#type=recovery&access_token=dummy&refresh_token=dummy'),{access_token:'dummy',refresh_token:'dummy'});
 assert.equal(cleared,'/password-recovery.html');
 for(const hash of ['#type=signup&access_token=dummy&refresh_token=dummy','#error=expired','#type=recovery&access_token=dummy'])assert.deepEqual(parse(hash),{invalid:true});
 assert.deepEqual(parse('','?code=dummy'),{invalid:true});
 assert.equal(RECOVERY_URL,'https://local-koho.com/demo/stores/password-recovery.html');
});
