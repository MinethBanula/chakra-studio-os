const fs=require('fs'),path=require('path'),zlib=require('zlib'),crypto=require('crypto');
const n=6;
const payload=Array.from({length:n},(_,i)=>fs.readFileSync(`c${i+1}.txt`,'utf8').trim()).join('');
const expected='90274bd4105b52d7a2851a12c466d0bdb472fa135c28e5cb3cfd330d9844d957';
const actual=crypto.createHash('sha256').update(payload).digest('hex');
if(actual!==expected) throw new Error(`Source checksum mismatch: ${actual} !== ${expected}`);
const files=JSON.parse(zlib.brotliDecompressSync(Buffer.from(payload,'base64')).toString('utf8'));
let restored=0, preserved=0;
for(const [file,v] of Object.entries(files)){
  if(fs.existsSync(file)){preserved++;continue;}
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,v.encoding==='base64'?Buffer.from(v.data,'base64'):v.data);
  restored++;
}
console.log(`V13 base restored: ${restored} files; overlay preserved: ${preserved} files.`);
