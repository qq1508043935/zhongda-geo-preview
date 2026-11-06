'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ROOT = __dirname;
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, '..', 'zhongda-private-data');
const PORT = Number(process.env.PORT || 18766);
const HOST = process.env.HOST || '0.0.0.0';
const MAX_BODY = 16 * 1024;
const rates = new Map();
fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.txt':'text/plain; charset=utf-8','.xml':'application/xml; charset=utf-8'};
function reply(res, status, data) {
  res.writeHead(status, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff' });
  res.end(JSON.stringify(data));
}
const server = http.createServer((req,res) => {
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname); }
  catch { return reply(res,400,{ok:false,message:'请求路径不正确'}); }
  if (pathname === '/api/health' && req.method === 'GET') {
    return reply(res,200,{ok:true,service:'zhongda-contact',storage:'local-json',time:new Date().toISOString()});
  }
  if (pathname === '/api/contact' && req.method === 'POST') {
    if (!String(req.headers['content-type'] || '').startsWith('application/json')) return reply(res,415,{ok:false,message:'请使用JSON提交'});
    const origin = req.headers.origin;
    if (origin) {
      try { if (new URL(origin).host !== req.headers.host) return reply(res,403,{ok:false,message:'不允许跨站提交'}); }
      catch { return reply(res,403,{ok:false,message:'来源不合法'}); }
    }
    const now = Date.now();
    // Never trust caller-supplied X-Forwarded-For. Preview proxy connections share a generous limit.
    const ip = req.socket.remoteAddress;
    const recent = (rates.get(ip) || []).filter(x=>now-x<60000);
    if(recent.length>=30) return reply(res,429,{ok:false,message:'请求过于频繁，请稍后再试'});
    recent.push(now); rates.set(ip,recent);
    let body=''; let bytes=0; let tooLarge=false;
    req.on('data',chunk=>{ bytes+=chunk.length; if(bytes>MAX_BODY){if(!tooLarge) reply(res,413,{ok:false,message:'提交内容过长'}); tooLarge=true;} else body+=chunk.toString('utf8'); });
    req.on('end',()=>{
      if(tooLarge)return;
      let v;
      try { v=JSON.parse(body); } catch {return reply(res,400,{ok:false,message:'JSON格式不正确'});}
      if(!v || typeof v!=='object' || Array.isArray(v))return reply(res,400,{ok:false,message:'内容格式不正确'});
      if(v.website)return reply(res,400,{ok:false,message:'请求无法处理'});
      const lead={};
      for (const [key,max] of [['company',120],['person',60],['phone',30],['note',2000]]) {
        if(typeof v[key]!=='string' && v[key]!==undefined)return reply(res,400,{ok:false,message:'字段格式不正确'});
        lead[key]=(v[key]||'').trim();
        if(lead[key].length>max)return reply(res,400,{ok:false,message:'字段超过长度限制'});
      }
      lead.phone=lead.phone.replace(/\s/g,'');
      if(!lead.company||!lead.person||!/^1[3-9]\d{9}$/.test(lead.phone))return reply(res,400,{ok:false,message:'请填写企业、联系人及有效的11位手机号'});
      if(v.consent!==true)return reply(res,400,{ok:false,message:'请确认同意将信息用于本次项目沟通'});
      lead.id=crypto.randomUUID(); lead.createdAt=new Date().toISOString(); lead.consent=true;
      // Files live outside the public document root. Exclusive create avoids overwriting leads.
      fs.writeFile(path.join(DATA_DIR,lead.id+'.json'),JSON.stringify(lead,null,2),{encoding:'utf8',mode:0o600,flag:'wx'},err=>{
        if(err){console.error('lead-save-failed',err.code);return reply(res,500,{ok:false,message:'保存失败，请稍后再试或电话联系'});}
        reply(res,201,{ok:true,id:lead.id,message:'咨询已保存。当前为演示测试系统，未自动通知客户，请勿填写真实敏感信息。'});
      });
    });
    return;
  }
  if(pathname.startsWith('/api/'))return reply(res,404,{ok:false,message:'接口不存在'});
  if(req.method!=='GET'&&req.method!=='HEAD')return reply(res,405,{ok:false,message:'请求方式不支持'});
  const allowed = ['/','/index.html','/style.css','/robots.txt','/sitemap.xml','/llms.txt'];
  if(!allowed.includes(pathname) && !/^\/assets\/[a-zA-Z0-9_.-]+\.(css|js|jpg|png)$/.test(pathname))return reply(res,404,{ok:false,message:'页面不存在'});
  const file=path.join(ROOT,pathname==='/'?'index.html':pathname);
  fs.readFile(file,(err,buf)=>{
    if(err)return reply(res,404,{ok:false,message:'页面不存在'});
    const ext=path.extname(file);
    if(process.env.SITE_URL && ['.html','.txt','.xml'].includes(ext))buf=Buffer.from(buf.toString('utf8').replaceAll('PUBLIC_SITE_URL',process.env.SITE_URL.replace(/\/$/,'')));
    res.writeHead(200,{'Content-Type':mime[ext]||'application/octet-stream','Content-Length':buf.length,'Cache-Control':'no-cache'});
    res.end(req.method==='HEAD'?undefined:buf);
  });
});
server.requestTimeout=15000;
server.headersTimeout=10000;
server.listen(PORT,HOST,()=>console.log(`Zhongda frontend + API listening on http://${HOST}:${PORT}; private lead storage enabled`));
