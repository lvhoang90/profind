// Kho Redis dùng chung cho các hàm Edge (tên bắt đầu bằng "_" nên Vercel không coi là một API).
// Chạy công khai: Upstash Redis qua REST (KV_REST_API_URL/KV_REST_API_TOKEN hoặc UPSTASH_REDIS_REST_URL/TOKEN).
// Chạy thử cục bộ (MAIL_PROVIDER=console): kho tạm trong bộ nhớ, mất khi tắt máy chủ.
const redisEnv = () => ({ url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL, token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN });

const mem = globalThis.__profindMem ?? (globalThis.__profindMem = new Map());
function memRun(cmds) {
  const live = (k) => { const e = mem.get(k); if (e && e.exp && e.exp < Date.now()) { mem.delete(k); return null; } return e ?? null; };
  const put = (k, v, e) => mem.set(k, { v, exp: e?.exp ?? 0 });
  return cmds.map(([op, k, ...a]) => {
    const e = op === "MGET" ? null : live(k);
    switch (op) {
      case "GET": return e ? e.v : null;
      case "MGET": return [k, ...a].map((x) => live(x)?.v ?? null);
      case "SET": mem.set(k, { v: a[0], exp: a[1] === "EX" ? Date.now() + Number(a[2]) * 1000 : 0 }); return "OK";
      case "DEL": mem.delete(k); return 1;
      case "INCR": { const n = Number(e?.v ?? 0) + 1; put(k, String(n), e); return n; }
      case "EXPIRE": if (e) e.exp = Date.now() + Number(a[0]) * 1000; return 1;
      case "HINCRBY": { const h = e?.v ?? {}; h[a[0]] = String(Number(h[a[0]] ?? 0) + Number(a[1])); put(k, h, e); return Number(h[a[0]]); }
      case "HSET": { const h = e?.v ?? {}; h[a[0]] = String(a[1]); put(k, h, e); return 1; }
      case "HGET": return e ? (e.v[a[0]] ?? null) : null;
      case "HDEL": { const h = e?.v ?? {}; delete h[a[0]]; put(k, h, e); return 1; }
      case "HLEN": return e ? Object.keys(e.v).length : 0;
      case "HGETALL": return e ? Object.entries(e.v).flat() : [];
      case "SADD": { const s = e?.v ?? []; if (!s.includes(a[0])) s.push(a[0]); put(k, s, e); return 1; }
      case "SREM": put(k, (e?.v ?? []).filter((x) => x !== a[0]), e); return 1;
      case "SCARD": return e ? e.v.length : 0;
      case "SMEMBERS": return e ? [...e.v] : [];
      default: throw new Error(`memRun: ${op}`);
    }
  });
}

/** Trả về { kind, run(cmds) } hoặc null nếu chưa cấu hình kho. */
export function makeStore() {
  const { url, token } = redisEnv();
  if (url && token) {
    const run = async (cmds) => {
      const out = [];
      for (let i = 0; i < cmds.length; i += 200) {
        const r = await fetch(`${url.replace(/\/$/, "")}/pipeline`, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(cmds.slice(i, i + 200)) });
        if (!r.ok) throw new Error(`redis ${r.status}`);
        out.push(...(await r.json()).map((x) => { if (x.error) throw new Error(x.error); return x.result; }));
      }
      return out;
    };
    return { kind: "redis", run };
  }
  if (String(process.env.MAIL_PROVIDER).toLowerCase() === "console") return { kind: "memory", run: async (c) => memRun(c) };
  return null;
}
