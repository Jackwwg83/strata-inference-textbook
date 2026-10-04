'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../dist');
const flag = process.argv.indexOf('--port');
const port = Number(flag >= 0 ? process.argv[flag+1] : process.env.PORT || 3000);
const host = process.env.HOST || '127.0.0.1';
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT must be 1..65535');
if(!fs.existsSync(path.join(root,'index.html')))throw new Error('Run npm run build first.');
const types={'.html':'text/html; charset=utf-8','.json':'application/json; charset=utf-8','.py':'text/plain; charset=utf-8','.md':'text/plain; charset=utf-8','.txt':'text/plain; charset=utf-8','.csv':'text/csv; charset=utf-8','.png':'image/png'};
const server = http.createServer((req,res)=>{
 if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405,{'Allow':'GET, HEAD'});return res.end('Method not allowed');}
 let pathname;
 try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);return res.end('Bad path');}
 if(pathname.includes('\0')){res.writeHead(400);return res.end('Bad path');}
 // A directory path such as /en/ serves its index.html, as Vercel does.
 const file=path.resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end('Forbidden');}
 fs.stat(file,(err,stat)=>{
  if(err||!stat.isFile()){res.writeHead(404);return res.end('Not found');}
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Content-Length':stat.size,'X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'});
  if(req.method==='HEAD')return res.end();
  const stream=fs.createReadStream(file);stream.on('error',()=>res.destroy());stream.pipe(res);
 });
});
server.on('error',e=>{console.error(e.message);process.exitCode=1;});
server.listen(port,host,()=>console.log(`Textbook: http://${host}:${port} (static files only)`));
