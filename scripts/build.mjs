import { cp, mkdir } from 'node:fs/promises';
import { versionAssets } from './version-assets.mjs';
const out=process.env.OUT_DIR||'_site';await mkdir(out,{recursive:true});
for(const name of ['index.html','contact.js','favicon.svg','styles.css','app.js','calc.mjs','amounts.mjs','restock.js','restock.mjs','date-picker.mjs','number-controls.mjs','hatches','bubble','rebirth','restock'])await cp(name,out+'/'+name,{recursive:true});
await versionAssets(out);
