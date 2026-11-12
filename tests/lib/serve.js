// Minimal Netlify-like static server for local testing.
// /skins -> skins.html, / -> index.html, /x.html also served, gzip like Netlify.
// Mirrors Netlify: /tests/*, /tools/*, /.github/* (netlify.toml rules), /netlify.toml and dot paths are 404.
// usage: node lib/serve.js [root] [port]
const http=require('http'),fs=require('fs'),path=require('path'),zlib=require('zlib');
const root=path.resolve(process.argv[2]||path.join(__dirname,'../..')),port=+(process.argv[3]||8787);
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.xml':'application/xml','.txt':'text/plain; charset=utf-8','.ico':'image/x-icon','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.webmanifest':'application/manifest+json'};
function resolve(u){let p=decodeURIComponent(u.split('?')[0]);if(/^\/(tests|tools|\.github)(\/|$)/.test(p)||p==='/netlify.toml'||/\/\./.test(p))return null;if(p.endsWith('/'))p+='index.html';
 const f=path.join(root,p);if(!f.startsWith(root))return null;
 if(fs.existsSync(f)&&fs.statSync(f).isFile())return f;
 if(fs.existsSync(f+'.html'))return f+'.html';return null;}
http.createServer((req,res)=>{const f=resolve(req.url);
 if(!f){res.writeHead(404,{'content-type':'text/plain'});return res.end('Not found');}
 const ext=path.extname(f);let body=fs.readFileSync(f);const h={'content-type':types[ext]||'application/octet-stream','cache-control':ext==='.html'?'public, max-age=0, must-revalidate':'public, max-age=31536000'};
 if(/gzip/.test(req.headers['accept-encoding']||'')&&/text|xml|json|svg|javascript/.test(h['content-type'])){body=zlib.gzipSync(body);h['content-encoding']='gzip';}
 res.writeHead(200,h);res.end(req.method==='HEAD'?undefined:body);
}).listen(port,()=>console.log(`serving ${root} on http://localhost:${port}`));
