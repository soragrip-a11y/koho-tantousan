import {chromium} from 'playwright';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'msedge'});try{const page=await browser.newPage({viewport:{width:2500,height:843},deviceScaleFactor:1});await page.setContent('<style>html,body{margin:0;width:2500px;height:843px;overflow:hidden}svg{display:block}</style>'+await fs.readFile('dist/demo/stores/rich-menu.svg','utf8'));await page.screenshot({path:'dist/demo/stores/rich-menu.png'});}finally{await browser.close();}
