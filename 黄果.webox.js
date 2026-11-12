const HG_SITE = "https://huangguoai.com";
const HG_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

WeBox.define({
  api: "1.4", id: "com.huangguoai.webox", name: "黄果短剧", version: "1.0.2", icon: HG_SITE + "/apple-touch-icon.png",
  requires: ["html", "crypto", "mediaProcessor", "imageDecoder"], cache: { list: 180, detail: 60, filters: 3600 },
  settings: { fields: [
    { key: "mode", label: "站点线路", type: "select", default: "main", options: [
      { label: "默认主站 (huangguoai.com)", value: "main" }, { label: "备用站点 (huangguoai.ai)", value: "ai" },
      { label: "最新地址入口 (hgai13.com)", value: "hg" }, { label: "手动输入地址", value: "custom" }
    ] },
    { key: "site", label: "自定义站点地址", type: "url", required: true, showWhen: { key: "mode", equals: "custom" }, placeholder: "https://huangguoai.com" },
    { key: "cookie", label: "登录/访问 Cookie（可选）", type: "secret", maxLength: 8192 },
    { key: "timeout", label: "请求超时秒数", type: "number", default: 15, min: 5, max: 30, step: 1 }
  ] },

  async filters(ctx) {
    const [categories, topics, tags] = await Promise.all([hgPublic(ctx, "/api/site/categories/video"), hgPublic(ctx, "/api/topics"), hgPublic(ctx, "/api/tags")]);
    const options = [{ label: "首页推荐", value: "/" }, { label: "最近上新", value: "latest" }, { label: "排行榜", value: "rank" }, { label: "精选专题", value: "topic" }];
    const aliases = { "ai-duanju": "drama", "ai-manju": "comic" };
    for (const row of hgItems(categories)) {
      const route = String(row.route || "").replace(/^\/+|\/+$/g, "");
      // The directory still advertises two retired routes that return HTTP 410.
      if (!["ai-duanju", "ai-manju"].includes(route) || !row.name) continue;
      const value = aliases[route] || "category:" + route;
      if (!options.some(o => o.value === value)) options.push({ label: hgText(row.name, 80), value });
    }
    const topicOptions = hgItems(topics).filter(row => /^[A-Za-z0-9_-]{1,200}$/.test(String(row.slug || row.route || "")) && (row.title || row.name))
      .map(row => ({ label: hgText(row.title || row.name, 80), value: String(row.slug || row.route) })).filter((row, i, rows) => rows.findIndex(x => x.value === row.value) === i).slice(0, 500);
    if (!topicOptions.length) options.splice(options.findIndex(x => x.value === "topic"), 1);
    const tagOptions = (Array.isArray(tags.categories) ? tags.categories : []).filter(c => String(c.name || "").includes("题材")).flatMap(c => Array.isArray(c.tags) ? c.tags : [])
      .filter(t => /^[^\u0000-\u001f\u007f]{1,100}$/.test(String(t.name || ""))).map(t => ({ label: hgText(t.name, 80), value: String(t.name) }))
      .filter((t, i, rows) => rows.findIndex(x => x.value === t.value) === i).slice(0, 499);
    if (tagOptions.length) options.push({ label: "题材筛选", value: "tags" });
    return [{ key: "category", label: "栏目分类", type: "select", default: "/", options },
      ...(topicOptions.length ? [{ key: "topic", label: "专题", type: "select", default: topicOptions[0].value, showWhen: { key: "category", equals: "topic" }, options: topicOptions }] : []),
      ...(tagOptions.length ? [{ key: "tag", label: "题材", type: "select", default: "", showWhen: { key: "category", equals: "tags" }, options: [{ label: "全部", value: "" }, ...tagOptions] }] : [])];
  },

  async list(ctx, req) {
    const page = hgPage(ctx, req.cursor), category = String(req.filters?.category || "/");
    if (category === "topic") {
      const topic = String(req.filters?.topic || "");
      if (!/^[A-Za-z0-9_-]{1,200}$/.test(topic)) ctx.fail("CONFIG_REQUIRED", "请选择一个专题");
      const value = await hgPublic(ctx, hgQuery("/api/topics/" + encodeURIComponent(topic), { page, size: 30 }));
      return hgVideoPage(ctx, value.videos || value, page);
    }
    let route = "/api/videos", query = { page, size: 30 };
    if (category === "tags") { const tag = String(req.filters?.tag || ""); if (tag && !/^[^\u0000-\u001f\u007f]{1,100}$/.test(tag)) ctx.fail("CONFIG_REQUIRED", "请选择有效题材"); if (tag) route = "/api/videos/tag/" + encodeURIComponent(tag); }
    else if (category === "rank") route = "/api/ranks/hot";
    else if (category === "latest") query.sort = "new";
    else if (category === "drama") route = "/api/videos/category/ai-duanju";
    else if (category === "comic") route = "/api/videos/category/ai-manju";
    else if (category.startsWith("category:") && /^[A-Za-z0-9_-]+$/.test(category.slice(9))) route = "/api/videos/category/" + category.slice(9);
    else if (category !== "/") ctx.fail("UNSUPPORTED", "栏目已变化，请刷新分类后重新选择");
    return hgVideoPage(ctx, await hgPublic(ctx, hgQuery(route, query)), page);
  },

  async search(ctx, req) {
    const keyword = String(req.query || "").trim();
    if (!keyword || keyword.length > 200) ctx.fail("CONFIG_REQUIRED", "请输入 1–200 个字符的搜索词");
    const page = hgPage(ctx, req.cursor);
    const value = await hgEncrypted(ctx, "dynamic", { method: "GET", path: hgQuery("/api/search", { q: keyword, type: "video", page, size: 30 }), body: "", content_type: "" });
    return hgVideoPage(ctx, value, page);
  },

  async detail(ctx, req) {
    const id = hgVideoIdentity(ctx, req.id), res = await hgRequest(ctx, "GET", "/video/" + id + "/", null, "text"), $ = ctx.html.load(res.data);
    let data; try { data = JSON.parse($("#videoInitialData").html() || "null"); } catch (_) {}
    if (!data || String(data.id) !== id) ctx.fail("INVALID_RESPONSE", "影片详情结构已变化，未找到对应影片信息");
    const episodes = new Map();
    $("a[data-ep-id][href]").each((_, el) => {
      const ep = Number($(el).attr("data-ep-id"));
      if (!Number.isInteger(ep) || ep < 1 || ep > 10000) return;
      const parsed = hgEpisodePath(ctx, $(el).attr("href"));
      if (parsed && parsed.video === id && parsed.ep === ep) episodes.set(ep, { id: parsed.path, name: "第" + ep + "集" });
    });
    if (!episodes.size) for (const ep of Object.keys(data.trackingEpisodes || {}).map(Number).filter(n => Number.isInteger(n) && n > 0 && n <= 10000)) episodes.set(ep, { id: hgEpisodeUrl(id, ep), name: "第" + ep + "集" });
    if (!episodes.size) { const ep = Number(data.ep) || 1; episodes.set(ep, { id: hgEpisodeUrl(id, ep), name: "正片" }); }
    const sorted = Array.from(episodes).sort((a, b) => a[0] - b[0]).map(x => x[1]), posterUrl = hgUrl(ctx, data.posterSrc || data.coverSrc, res.url);
    const poster = hgPoster(posterUrl, hgBase(ctx), hgEncryptedPoster(posterUrl, hgBase(ctx)) ? await hgImageProtocol(ctx) : null);
    return { id: req.id, kind: sorted.length > 1 ? "series" : "movie", title: hgText(data.title, 240) || hgText($("h1").first().text(), 240),
      ...(poster ? { poster } : {}), summary: hgText(data.description, 65536), groups: [{ id: "main", name: "默认线路", episodes: sorted }] };
  },

  async play(ctx, req) {
    const id = hgVideoIdentity(ctx, req.contentId), parsed = hgEpisodePath(ctx, req.episodeId);
    if (!parsed || parsed.video !== id || req.groupId !== "main") ctx.fail("NOT_FOUND", "选集与影片不匹配，请重新打开详情");
    const ep = parsed.ep;
    const value = await hgEncrypted(ctx, "playback", { method: "POST", path: "/api/videos/" + id + "/episodes/" + ep + "/playback", body: ctx.crypto.base64Encode("{}"), content_type: "application/json" });
    if (String(value.id) !== id || Number(value.ep) !== ep || value.manifest_method !== "GET" || !value.streams?.main) ctx.fail("INVALID_RESPONSE", "播放接口返回的影片或选集身份不匹配");
    const referer = hgBase(ctx) + hgEpisodeUrl(id, ep), cdn = value.cdn || {}, sources = [];
    for (const [key, name, raw] of [["main", "默认线路", value.streams.main], ["hevc", "HEVC 线路", value.streams.hevc]]) {
      const url = hgUrl(ctx, raw, referer); if (!url || sources.some(s => s.url === url)) continue;
      sources.push({ id: key, name, url, mime: hgMime(url), headers: { "User-Agent": HG_UA }, downloadable: true,
        processor: { request: "request", context: { origin: ctx.url.origin(url), referer, m3u8Enabled: !!cdn.m3u8Enabled, otherEnabled: !!cdn.otherEnabled,
          authKey: String(cdn.authKey || ""), authValue: String(cdn.authValue || ""), app: String(cdn.app || "") } } });
    }
    if (!sources.length) ctx.fail("INVALID_RESPONSE", "播放接口没有返回有效的 HTTP 媒体地址");
    return { sources };
  },

  media: { request(ctx, input) {
    const c = input.context || {}, headers = { ...(input.headers || {}), "User-Agent": HG_UA };
    if (ctx.url.origin(input.url) === c.origin) {
      headers.Referer = c.referer; headers.Origin = ctx.url.origin(c.referer);
      const auth = (input.kind === "playlist" && c.m3u8Enabled) || (c.otherEnabled && /\.(?:ts|m4s|key)(?:[?#]|$)/i.test(input.url));
      if (auth && /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(c.authKey) && c.authValue && !/[\r\n]/.test(c.authValue + c.app)) { headers[c.authKey] = c.authValue; headers["x-cdn-app"] = c.app; }
    } else for (const key of Object.keys(headers)) if (/cookie|authorization|referer|origin/i.test(key) || key.toLowerCase() === String(c.authKey).toLowerCase() || key.toLowerCase() === "x-cdn-app") delete headers[key];
    return { url: input.url, headers };
  } }
});

function hgText(v, max = 1024) { return String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max); }
function hgBase(ctx) {
  const mode = ctx.settings.mode || "main";
  if (mode === "hg") ctx.fail("CONFIG_REQUIRED", "hgai13.com 是最新地址入口，请选择主站或填写入口提供的实际站点", { fields: ["mode", "site"] });
  const value = mode === "custom" ? String(ctx.settings.site || "").trim() : mode === "ai" ? "https://huangguoai.ai" : HG_SITE;
  if (!/^https?:\/\//i.test(value)) ctx.fail("CONFIG_REQUIRED", "请填写有效站点地址", { fields: ["site"] }); return ctx.url.origin(value);
}
function hgPage(ctx, cursor) { if (cursor === null) return 1; if (typeof cursor !== "string" || !/^[1-9]\d{0,3}$/.test(cursor)) ctx.fail("INVALID_RESPONSE", "分页状态无效，请刷新列表"); return Number(cursor); }
function hgQuery(path, params) { return path + "?" + Object.entries(params).map(([k, v]) => encodeURIComponent(k) + "=" + encodeURIComponent(v)).join("&"); }
function hgUrl(ctx, raw, base) {
  let s = String(raw || "").trim().replace(/\\u0026/gi, "&").replace(/\\u002f/gi, "/").replace(/\\\//g, "/").replace(/&amp;/gi, "&");
  if (/^https?%3a%2f%2f/i.test(s)) { try { s = decodeURIComponent(s); } catch (_) { return ""; } }
  if (!s || /^(?:data|javascript|blob):/i.test(s)) return "";
  try { const url = ctx.url.resolve(s, base); return /^https?:\/\//i.test(url) ? url : ""; } catch (_) { return ""; }
}
function hgMime(url) { const ext = /\.([a-z0-9]+)(?:[?#]|$)/i.exec(url)?.[1]?.toLowerCase(); return ({ m3u8: "application/vnd.apple.mpegurl", mp4: "video/mp4", webm: "video/webm", mkv: "video/x-matroska", flv: "video/x-flv" })[ext] || ""; }
function hgVideoIdentity(ctx, raw) { const parsed = hgEpisodePath(ctx, raw); if (!parsed) ctx.fail("NOT_FOUND", "影片身份无效，请重新打开列表"); return parsed.video; }
function hgEpisodePath(ctx, raw) {
  const base = hgBase(ctx), url = hgUrl(ctx, raw, base); if (!url || ctx.url.origin(url) !== base) return null;
  const path = url.slice(base.length).split(/[?#]/)[0], m = /^\/video\/([1-9]\d{0,18})\/(?:ep-([1-9]\d{0,3})\/)?$/.exec(path);
  return m ? { video: m[1], ep: Number(m[2] || 1), path } : null;
}
function hgEpisodeUrl(id, ep) { return "/video/" + id + "/" + (ep > 1 ? "ep-" + ep + "/" : ""); }
function hgItems(v) { return Array.isArray(v) ? v : Array.isArray(v?.items) ? v.items : []; }
function hgCard(ctx, row, decoder = null) {
  const id = String(row.id || row.video_id || ""), title = hgText(row.title, 240); if (!/^[1-9]\d{0,18}$/.test(id) || !title) return null;
  const poster = hgPoster(hgUrl(ctx, row.cover, hgBase(ctx)), hgBase(ctx), decoder), count = Number(row.episode_count || row.total_episodes);
  return { id: "/video/" + id + "/", title, kind: count > 1 ? "series" : "unknown", ...(poster ? { poster } : {}), ...(count > 0 ? { subtitle: (row.is_finished ? "全" : "更新至") + count + "集" } : {}),
    ...(Number(row.score) > 0 && Number(row.score) <= 10 ? { rating: { value: Number(row.score), scale: 10, label: "评分" } } : {}) };
}
function hgNext(value, page, count) { const p = value?.pagination; return count && p && Number(p.page) === page && Number(p.pages) > page ? String(page + 1) : null; }
async function hgVideoPage(ctx, value, page) {
  if (!Array.isArray(value) && !Array.isArray(value?.items)) ctx.fail("INVALID_RESPONSE", "站点返回的数据缺少影片列表");
  const rows = hgItems(value), base = hgBase(ctx), decoder = rows.some(row => hgEncryptedPoster(hgUrl(ctx, row.cover, base), base)) ? await hgImageProtocol(ctx) : null;
  const seen = new Set(), items = rows.map(x => hgCard(ctx, x, decoder)).filter(x => x && !seen.has(x.id) && seen.add(x.id));
  return { items, nextCursor: hgNext(value, page, items.length) };
}
// Both original and WebP CDN covers are ciphertext. Keep the signed original URL
// intact; pass the public site protocol to the native decoder instead of guessing
// a plaintext domain, fetching every cover in JavaScript, or evaluating site code.
const HG_IMAGE_PROTOCOLS = new Map();
function hgEncryptedPoster(url, base) {
  if (!url) return false;
  const path = url.slice(url.indexOf("://") + 3).replace(/^[^/]+/, "").split(/[?#]/)[0];
  return !/^\/static\//i.test(path) && /\.(?:jpe?g|png|bmp|webp)$/i.test(path) && !(url.startsWith(base + "/") && path === "/apple-touch-icon.png");
}
function hgPoster(url, base, decoder) { return url && decoder && hgEncryptedPoster(url, base) ? { url, decode: decoder } : url; }
async function hgImageProtocol(ctx) {
  const identity = JSON.stringify([hgBase(ctx), ctx.settings.cookie || ""]), cached = HG_IMAGE_PROTOCOLS.get(identity);
  if (cached && cached.expires > Date.now()) return cached.promise;
  const entry = { expires: Date.now() + 300000, promise: null };
  entry.promise = (async () => {
    const res = await hgRequest(ctx, "GET", "/static/web/js/plugins/crypto-image-protocol.js", null, "text");
    let protocol;
    try { protocol = JSON.parse(/CryptoImageProtocol\s*=\s*Object\.freeze\(\s*(\{[^{}]{1,4096}\})\s*\)/.exec(res.data)?.[1] || "null"); } catch (_) {}
    if (protocol?.decryptEnabled === false) return null;
    let key = "", iv = "";
    try { if (typeof protocol?.decryptKey === "string" && typeof protocol?.decryptIV === "string") { key = hgUtf8Hex(protocol.decryptKey); iv = hgUtf8Hex(protocol.decryptIV); } } catch (_) {}
    if (protocol?.decryptEnabled !== true || key.length !== 32 || iv.length !== 32)
      ctx.fail("INVALID_RESPONSE", "站点图片解密协议已变化，请更新黄果源", { stage: "image-protocol" });
    return { algorithm: "aes-cbc", key, iv, padding: "none" };
  })();
  if (HG_IMAGE_PROTOCOLS.size >= 4) HG_IMAGE_PROTOCOLS.delete(HG_IMAGE_PROTOCOLS.keys().next().value);
  HG_IMAGE_PROTOCOLS.set(identity, entry);
  try { return await entry.promise; } catch (error) { if (HG_IMAGE_PROTOCOLS.get(identity) === entry) HG_IMAGE_PROTOCOLS.delete(identity); throw error; }
}
async function hgRequest(ctx, method, path, body, type = "json", extra = {}, sessionErrors = false) {
  ctx.signal.throwIfAborted(); const base = hgBase(ctx), url = ctx.url.resolve(path, base); if (ctx.url.origin(url) !== base) ctx.fail("INVALID_RESPONSE", "接口地址不属于当前站点");
  const headers = { "User-Agent": HG_UA, Referer: base + "/", Origin: base, ...extra }, cookie = String(ctx.settings.cookie || "").trim();
  if (cookie) { if (/[\r\n]/.test(cookie)) ctx.fail("CONFIG_REQUIRED", "Cookie 不能包含换行", { fields: ["cookie"] }); headers.Cookie = cookie; }
  let res;
  try { res = await ctx.http[method.toLowerCase()](url, { headers, responseType: "text", timeoutMs: Math.max(5, Math.min(30, Number(ctx.settings.timeout) || 15)) * 1000, ...(body !== null ? { json: body } : {}) }); }
  catch (error) { ctx.signal.throwIfAborted(); const timeout = /timeout|timed out|超时/i.test(String(error.message)); ctx.fail(timeout ? "TIMEOUT" : "NETWORK", timeout ? "站点请求超时，请稍后重试" : "无法连接站点，请检查网络或节点", { stage: "source-http" }); }
  ctx.signal.throwIfAborted();
  if (sessionErrors && res.status === 400) { try { const data = JSON.parse(res.data); if (data.error === "session_expired") return { ...res, data }; } catch (_) {} }
  hgStatus(ctx, res.status, res.headers); if (type === "text") return res;
  try { return { ...res, data: typeof res.data === "string" ? JSON.parse(res.data) : res.data }; } catch (_) { ctx.fail("INVALID_RESPONSE", "站点接口未返回有效 JSON", { stage: "source-json" }); }
}
function hgStatus(ctx, status, headers = {}) {
  if (status >= 200 && status < 300) return;
  const retry = Number(headers["retry-after"] || headers["Retry-After"]), code = status === 429 ? "RATE_LIMITED" : [401, 403].includes(status) ? "AUTH_REQUIRED" : status === 404 ? "NOT_FOUND" : "NETWORK";
  ctx.fail(code, status === 429 ? "站点请求受限，请稍后重试" : [401, 403].includes(status) ? "站点拒绝访问，请检查访问条件或登录状态" : "站点接口请求失败（HTTP " + status + "）", { httpStatus: status, stage: "source-http", ...(Number.isFinite(retry) && retry > 0 ? { retryAfterSeconds: Math.min(86400, retry) } : {}) });
}
function hgBusiness(ctx, json) {
  if (!json || typeof json !== "object" || ![1, 200].includes(Number(json.status ?? json.code))) {
    const status = Number(json?.status ?? json?.code), reason = hgText(json?.msg || json?.message, 250).replace(/https?:\/\/\S+/g, "[地址]");
    ctx.fail([401, 403, 110].includes(status) ? "AUTH_REQUIRED" : status === 429 ? "RATE_LIMITED" : "INVALID_RESPONSE", reason || "站点接口返回失败状态", { stage: "source-business" });
  }
  if (!json.data || typeof json.data !== "object") ctx.fail("INVALID_RESPONSE", "站点接口缺少数据"); return json.data;
}
async function hgPublic(ctx, path) { return hgBusiness(ctx, (await hgRequest(ctx, "POST", "/api/public/request", { method: "GET", path, body: "", content_type: "" }, "json", { "X-HG-Public-JSON": "1" })).data); }

// Public visitor transport. No persistent credentials or keys.
const HG_SESSIONS = new Map();
const HG_P = 0xffffffff00000001000000000000000000000000ffffffffffffffffffffffffn;
const HG_N = 0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551n;
const HG_G = [0x6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296n, 0x4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5n];
function hgMod(x) { return (x % HG_P + HG_P) % HG_P; }
function hgInv(x) { let a=hgMod(x),b=HG_P,u=1n,v=0n; while(b){const q=a/b;[a,b]=[b,a%b];[u,v]=[v,u-q*v];} if(a!==1n)throw Error('invalid curve inverse');return hgMod(u); }
function hgAdd(a,b) {if(!a)return b;if(!b)return a;if(a[0]===b[0]&&hgMod(a[1]+b[1])===0n)return null;const m=a[0]===b[0]?hgMod((3n*a[0]*a[0]-3n)*hgInv(2n*a[1])):hgMod((b[1]-a[1])*hgInv(b[0]-a[0]));const x=hgMod(m*m-a[0]-b[0]);return [x,hgMod(m*(a[0]-x)-a[1])];}
function hgMul(ctx,n,p){let r=null;for(let i=0;i<256;i++){if(i%16===0)ctx.signal.throwIfAborted();if(n&1n)r=hgAdd(r,p);n>>=1n;p=hgAdd(p,p);}if(!r)throw Error('invalid curve point');return r;}
function hgHex(n,bytes=32){return n.toString(16).padStart(bytes*2,'0');}
function hgUtf8Hex(s){return Array.from(new TextEncoder().encode(s),b=>b.toString(16).padStart(2,'0')).join('');}
function hgHexUtf8(hex){return new TextDecoder().decode(Uint8Array.from(hex.match(/../g)||[],h=>parseInt(h,16)));}
function hgB64Hex(s){s=String(s).replace(/-/g,'+').replace(/_/g,'/');if(!/^[A-Za-z0-9+/]*={0,2}$/.test(s))throw Error('invalid base64');return Array.from(atob(s),c=>c.charCodeAt(0).toString(16).padStart(2,'0')).join('');}
function hgHexB64(hex){return btoa((hex.match(/../g)||[]).map(h=>String.fromCharCode(parseInt(h,16))).join('')).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function hgHmac(ctx,data,key){return ctx.crypto.hmac('SHA256',data,key,{inputEncoding:'hex',keyEncoding:'hex',outputEncoding:'hex'});}
function hgDerive(ctx,shared,salt,info){return hgHmac(ctx,hgUtf8Hex(info)+'01',hgHmac(ctx,shared,salt));}
function hgBlock(ctx,hex,key){return ctx.crypto.aesEncrypt(hex,key,'',{mode:'ECB',padding:'NoPadding',inputEncoding:'hex',keyEncoding:'hex',outputEncoding:'hex'});}
function hgGhash(aad,cipher,h){const H=BigInt('0x'+h),R=0xe1000000000000000000000000000000n;let y=0n;const blocks=aad.padEnd(Math.ceil(aad.length/32)*32,'0')+cipher.padEnd(Math.ceil(cipher.length/32)*32,'0')+hgHex(BigInt(aad.length*4),8)+hgHex(BigInt(cipher.length*4),8);for(let i=0;i<blocks.length;i+=32){const x=y^BigInt('0x'+blocks.slice(i,i+32));let z=0n,v=H;for(let b=127n;b>=0n;b--){if((x>>b)&1n)z^=v;v=(v>>1n)^(v&1n?R:0n);}y=z;}return y;}
function hgGcm(ctx,key,iv,aad,value,decrypt=false){
 if(!/^[0-9a-f]{64}$/i.test(key)||!/^[0-9a-f]{24}$/i.test(iv)||value.length>4*1024*1024)throw Error('invalid GCM input');
 if(decrypt&&value.length<32)throw Error('missing GCM tag');
 const options={mode:'CTR',padding:'NoPadding',inputEncoding:'hex',keyEncoding:'hex',ivEncoding:'hex',outputEncoding:'hex'};
 const cipher=decrypt?value.slice(0,-32):ctx.crypto.aesEncrypt(value,key,iv+'00000002',options);
 const tag=hgHex(hgGhash(aad,cipher,hgBlock(ctx,'0'.repeat(32),key))^BigInt('0x'+hgBlock(ctx,iv+'00000001',key)),16);
 if(decrypt){let diff=0;const expected=value.slice(-32).toLowerCase();for(let i=0;i<32;i++)diff|=tag.charCodeAt(i)^expected.charCodeAt(i);if(diff)throw Error('GCM authentication failed');return ctx.crypto.aesDecrypt(cipher,key,iv+'00000002',options);}
 return cipher+tag;
}
async function hgOpenSession(ctx,scope){
 if(!globalThis.crypto?.getRandomValues)ctx.fail('UNSUPPORTED','当前 WeBox 缺少安全随机数能力，请更新应用');
 let n;do{const a=new Uint8Array(32);globalThis.crypto.getRandomValues(a);n=BigInt('0x'+Array.from(a,b=>b.toString(16).padStart(2,'0')).join(''));}while(n<1n||n>=HG_N);
 const pub=hgMul(ctx,n,HG_G),hello=(await hgRequest(ctx,'POST','/api/'+scope+'/request',{v:1,type:'hello',client_pub:hgHexB64('04'+hgHex(pub[0])+hgHex(pub[1]))})).data;
 if(hello?.v!==1||hello.type!=='hello'||!/^[A-Za-z0-9_-]{1,64}$/.test(hello.kid)||!/^[A-Za-z0-9_-]{16,128}$/.test(hello.sid)||!/^[A-Za-z0-9.:[\]-]{1,256}$/.test(hello.site)||!Number.isSafeInteger(hello.server_time)||!Number.isSafeInteger(hello.expires_at)||hello.expires_at<=hello.server_time||hello.expires_at-hello.server_time>600)ctx.fail('INVALID_RESPONSE','站点加密会话响应无效');
 try{const raw=hgB64Hex(hello.server_pub),salt=hgB64Hex(hello.salt);if(!/^04[0-9a-f]{128}$/i.test(raw)||salt.length!==64)throw Error('invalid handshake key');
 const p=[BigInt('0x'+raw.slice(2,66)),BigInt('0x'+raw.slice(66))],b=0x5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604bn;
 if(p.some(x=>x>=HG_P)||hgMod(p[1]**2n-(p[0]**3n-3n*p[0]+b))!==0n)throw Error('invalid server curve point');
 const shared=hgHex(hgMul(ctx,n,p)[0]),info=['dx150-edge-v1',scope,hello.site,hello.kid,hello.sid].join('\n'),local=Math.floor(Date.now()/1000);
 return {kid:hello.kid,sid:hello.sid,info,sequence:0,expires:local+hello.expires_at-hello.server_time,skew:hello.server_time-local,requestKey:hgDerive(ctx,shared,salt,info+'\nreq'),responseKey:hgDerive(ctx,shared,salt,info+'\nres')};
 }catch(e){ctx.signal.throwIfAborted();ctx.fail('INVALID_RESPONSE','无法建立站点加密会话');}
}
async function hgEncrypted(ctx,scope,request,renewed=false){
 if(!['playback','dynamic'].includes(scope))ctx.fail('UNSUPPORTED','不支持的站点接口范围');
 const identity=JSON.stringify([hgBase(ctx),ctx.settings.cookie||'',scope]);let s=HG_SESSIONS.get(identity);
 if(!s||s.expires<=Date.now()/1000+5||s.sequence>=16384){s=await hgOpenSession(ctx,scope);if(HG_SESSIONS.size>=4)HG_SESSIONS.delete(HG_SESSIONS.keys().next().value);HG_SESSIONS.set(identity,s);}
 const seq=++s.sequence,ts=Math.floor(Date.now()/1000)+s.skew,iv='0'.repeat(16)+hgHex(BigInt(seq),4),aad=d=>hgUtf8Hex([s.info,d,seq,ts].join('\n'));
 const ciphertext=hgHexB64(hgGcm(ctx,s.requestKey,iv,aad('req'),hgUtf8Hex(JSON.stringify({request}))));
 const result=(await hgRequest(ctx,'POST','/api/'+scope+'/request',{v:1,type:'call',kid:s.kid,sid:s.sid,seq,ts,ciphertext},'json',{},true)).data;
 if(result?.error==='session_expired'){HG_SESSIONS.delete(identity);if(!renewed)return hgEncrypted(ctx,scope,request,true);ctx.fail('AUTH_REQUIRED','站点接口会话已失效，请稍后重试');}
 if(result?.v!==1||result.type!=='result'||result.sid!==s.sid||result.kid!==s.kid||result.seq!==seq||result.ts!==ts){HG_SESSIONS.delete(identity);ctx.fail('INVALID_RESPONSE','站点加密响应与本次请求不匹配');}
 let inner;try{inner=JSON.parse(hgHexUtf8(hgGcm(ctx,s.responseKey,iv,aad('res'),hgB64Hex(result.ciphertext),true)));}catch(_){HG_SESSIONS.delete(identity);ctx.fail('INVALID_RESPONSE','站点响应认证或解密失败');}
 if(!Number.isInteger(inner.status)||inner.status<200||inner.status>599)ctx.fail('INVALID_RESPONSE','站点响应状态无效');
 const headers=Object.fromEntries(Object.entries(inner.headers||{}).map(([k,v])=>[k.toLowerCase(),Array.isArray(v)?v.join(', '):String(v)]));hgStatus(ctx,inner.status,headers);
 let data;try{data=JSON.parse(ctx.crypto.base64Decode(inner.body));}catch(_){ctx.fail('INVALID_RESPONSE','站点响应正文无效');}return hgBusiness(ctx,data);
}
