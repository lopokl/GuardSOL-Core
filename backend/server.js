import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { pinoHttp } from "pino-http";
import pino from "pino";
import axios from "axios";
import { LRUCache as LRU } from "lru-cache";
import Database from "better-sqlite3";
import { z } from "zod";
import crypto from "crypto";
import "dotenv/config";

// ---- env
const PORT = Number(process.env.PORT || 8080);
const ALLOWED = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const HELIUS_KEY = process.env.HELIUS_API_KEY || "";
const GOPLUS_APP_KEY = process.env.GOPLUS_APP_KEY || "";
const GOPLUS_APP_SECRET = process.env.GOPLUS_APP_SECRET || "";
const DB_FILE = process.env.SQLITE_FILE || "data.db";

// ---- logger
const logger = pino({ level: process.env.LOG_LEVEL || "info" });

// ---- db
const db = new Database(DB_FILE);
db.pragma("journal_mode = WAL");

// ---- utils
const isSolanaAddr = (a) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a || "");
const AddressSchema = z.object({
  address: z.string().refine(isSolanaAddr, "Invalid Solana address"),
  useGoPlus: z.boolean().optional().default(false),
});

// Risk scoring - same rules as frontend
const GOPLUS_CRITICAL_KEYS = new Set([
  "phishing_activities",
  "stealing_attack",
  "blacklist_doubt",
  "fake_kyc",
  "malicious_behavior",
  "is_blacklist",
]);
function computeRiskScore({
  localMatchesCount,
  goplusPositives = {},
  txCount = 0,
  hasAssets = false,
}) {
  let score = 0;
  if (localMatchesCount > 0) score = Math.max(score, 90);
  const posKeys = Object.keys(goplusPositives);
  const hasCritical = posKeys.some((k) => GOPLUS_CRITICAL_KEYS.has(k));
  if (hasCritical) score = Math.max(score, 80);
  else if (posKeys.length > 0) score = Math.max(score, 60);
  if (txCount === 0 && !hasAssets) score = Math.max(score, 40);
  if (txCount > 10 || hasAssets) score = Math.max(0, score - 10);
  return Math.max(0, Math.min(100, score));
}
function riskLabel(score) {
  if (score >= 70) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}

// ---- cache (LRU)
const cache = new LRU({ max: 500, ttl: 60_000 }); // 60s default

// ---- express
const app = express();
app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (
        ALLOWED.includes(origin) ||
        ALLOWED.includes("*") ||
        origin.startsWith("chrome-extension://")
      ) {
        return cb(null, true);
      }
      return cb(new Error("Not allowed by CORS"), false);
    },
  }),
);
app.use(pinoHttp({ logger }));
app.set("trust proxy", 1);

// ---- rate limit
app.use(
  "/api/",
  rateLimit({
    windowMs: 60_000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

// ---- db statements
const stmtUpsertBL = db.prepare(`
INSERT INTO blacklist(address, reason, source) VALUES(@address,@reason,@source)
ON CONFLICT(address) DO UPDATE SET reason=excluded.reason, source=excluded.source
`);
const stmtGetBL = db.prepare(
  `SELECT address, reason, source, created_at FROM blacklist WHERE address = ?`,
);
const stmtListBL = db.prepare(
  `SELECT address, reason, source, created_at FROM blacklist ORDER BY created_at DESC LIMIT ? OFFSET ?`,
);
const stmtDeleteBL = db.prepare(`DELETE FROM blacklist WHERE address = ?`);

const stmtInsertHist = db.prepare(`
INSERT INTO history(address, summary, risk_score, risk_label, details_json, errors_json)
VALUES(?,?,?,?,?,?)
`);
const stmtListHist = db.prepare(
  `SELECT id,address,summary,risk_score,risk_label,details_json,errors_json,created_at FROM history ORDER BY created_at DESC LIMIT ? OFFSET ?`,
);

// ---- externals
async function heliusFetch(address) {
  if (!HELIUS_KEY) return { balances: null, transactions: null };
  const ck1 = `helius:tx:${address}`;
  const ck2 = `helius:bal:${address}`;
  if (cache.has(ck1) && cache.has(ck2)) {
    return { transactions: cache.get(ck1), balances: cache.get(ck2) };
  }
  const base = "https://api.helius.xyz/v0/addresses";
  const [txRes, balRes] = await Promise.all([
    axios
      .get(`${base}/${encodeURIComponent(address)}/transactions`, {
        params: { "api-key": HELIUS_KEY, limit: 50 },
      })
      .catch((e) => ({ data: { error: e.message } })),
    axios
      .get(`${base}/${encodeURIComponent(address)}/balances`, {
        params: { "api-key": HELIUS_KEY },
      })
      .catch((e) => ({ data: { error: e.message } })),
  ]);
  const transactions =
    txRes.data && Array.isArray(txRes.data)
      ? txRes.data
      : txRes.data?.error
        ? { error: txRes.data.error }
        : [];
  const balances = balRes.data?.error
    ? { error: balRes.data.error }
    : balRes.data || {};
  cache.set(ck1, transactions, { ttl: 30_000 });
  cache.set(ck2, balances, { ttl: 30_000 });
  return { transactions, balances };
}

// --- GoPlus: correct token signing flow (fix 4012)
async function getGoPlusAccessToken() {
  const ck = "goplus:access_token";
  const cached = cache.get(ck);
  if (cached) return cached;

  if (!GOPLUS_APP_KEY || !GOPLUS_APP_SECRET) {
    throw new Error("GoPlus app_key/app_secret are missing");
  }

  const time = Math.floor(Date.now() / 1000); // seconds!
  const sign = crypto
    .createHash("sha1")
    .update(`${GOPLUS_APP_KEY}${time}${GOPLUS_APP_SECRET}`)
    .digest("hex");

  const { data } = await axios
    .post("https://api.gopluslabs.io/api/v1/token", {
      app_key: GOPLUS_APP_KEY,
      time,
      sign,
    })
    .catch((e) => ({ data: { error: e.message } }));

  if (!data || data.error || !data.result || !data.result.access_token) {
    throw new Error(
      `GoPlus token error: ${data?.error || "no result.access_token"}`,
    );
  }

  const token = data.result.access_token;
  cache.set(ck, token, { ttl: 55 * 60 * 1000 }); // ~55min
  return token;
}

async function goplusFetch(address) {
  const ck = `goplus:${address}`;
  if (cache.has(ck)) return cache.get(ck);

  const token = await getGoPlusAccessToken();
  const url = `https://api.gopluslabs.io/api/v1/address_security/${encodeURIComponent(address)}?chain_id=solana&access_token=${encodeURIComponent(token)}`;
  const { data } = await axios
    .get(url)
    .catch((e) => ({ data: { error: e.message } }));

  cache.set(ck, data, { ttl: 60_000 });
  return data;
}

// ---- API
app.get("/health", (_req, res) => res.json({ ok: true }));

// CHECK
app.post("/api/check", async (req, res) => {
  try {
    const { address, useGoPlus = false } = AddressSchema.parse(req.body);

    const bl = stmtGetBL.get(address);
    const localMatches = bl ? [bl] : [];

    const [hData, gData] = await Promise.all([
      heliusFetch(address),
      useGoPlus ? goplusFetch(address) : Promise.resolve(null),
    ]);

    const txArr = Array.isArray(hData.transactions) ? hData.transactions : [];
    const bal = hData.balances && !hData.balances.error ? hData.balances : null;

    // GoPlus positives
    let gRaw = null,
      gPos = {};
    if (gData && gData.result) {
      gRaw = gData.result;
      for (const k in gRaw) {
        const v = gRaw[k];
        if (
          v === 1 ||
          v === "1" ||
          v === true ||
          String(v).toLowerCase() === "true"
        )
          gPos[k] = v;
      }
    }

    const hasAssets = !!(
      bal &&
      ((bal.native && Number(bal.native) > 0) ||
        (Array.isArray(bal.tokens) && bal.tokens.length))
    );
    const score = computeRiskScore({
      localMatchesCount: localMatches.length,
      goplusPositives: gPos,
      txCount: txArr.length,
      hasAssets,
    });
    const label = riskLabel(score);

    const summaryParts = [];
    if (localMatches.length) summaryParts.push(`Local: ${localMatches.length}`);
    if (HELIUS_KEY) {
      summaryParts.push(`Helius TX: ${txArr.length}`);
      summaryParts.push(`Helius Bal: ${hasAssets ? "assets" : "none"}`);
    } else {
      summaryParts.push("Helius: off");
    }
    if (useGoPlus) {
      const c = Object.keys(gPos).length;
      summaryParts.push(`GoPlus: ${c ? "flags " + c : "0"}`);
    } else {
      summaryParts.push("GoPlus: off");
    }
    summaryParts.push(`Risk: ${label} (${score})`);

    const details = {
      local: { matches: localMatches },
      helius: { transactions: txArr.slice(0, 10), balances: bal || {} },
      goplus: useGoPlus
        ? { raw: gRaw || gData || {}, positives: gPos }
        : undefined,
    };

    stmtInsertHist.run(
      address,
      summaryParts.join(" · "),
      score,
      label,
      JSON.stringify(details),
      JSON.stringify([]),
    );

    return res.json({
      ok: true,
      address,
      summary: summaryParts.join(" · "),
      risk: { score, label },
      details,
    });
  } catch (e) {
    req.log?.error?.(e);
    return res
      .status(400)
      .json({ ok: false, error: e?.message || "Bad request" });
  }
});

// BLACKLIST endpoints
app.get("/api/blacklist", (req, res) => {
  const limit = Math.min(Number(req.query.limit || 500), 2000);
  const offset = Math.max(Number(req.query.offset || 0), 0);
  const rows = stmtListBL.all(limit, offset);
  res.json({ ok: true, items: rows, limit, offset });
});
app.post("/api/blacklist", (req, res) => {
  const { address, reason = "", source = "manual" } = req.body || {};
  if (!isSolanaAddr(address))
    return res.status(400).json({ ok: false, error: "Invalid address" });
  stmtUpsertBL.run({ address, reason, source });
  res.json({ ok: true });
});
app.post("/api/blacklist/import", (req, res) => {
  const { addresses } = req.body || {};
  if (!Array.isArray(addresses))
    return res.status(400).json({ ok: false, error: "addresses[] required" });
  const insert = db.prepare(
    "INSERT OR IGNORE INTO blacklist(address, reason, source) VALUES(?,?,?)",
  );
  const trx = db.transaction((items) => {
    for (const it of items)
      insert.run(it.address, it.reason || "", it.source || "import");
  });
  const rows = addresses
    .map((x) => ({
      address: (x.address || x.pubkey || x.wallet || x[0] || "").trim(),
      reason: x.reason || "",
      source: x.source || "import",
    }))
    .filter((x) => isSolanaAddr(x.address));
  trx(rows);
  res.json({ ok: true, imported: rows.length });
});
app.delete("/api/blacklist/:address", (req, res) => {
  const addr = (req.params.address || "").trim();
  if (!isSolanaAddr(addr))
    return res.status(400).json({ ok: false, error: "Invalid address" });
  stmtDeleteBL.run(addr);
  res.json({ ok: true });
});

// HISTORY
app.get("/api/history", (req, res) => {
  const limit = Math.min(Number(req.query.limit || 100), 500);
  const offset = Math.max(Number(req.query.offset || 0), 0);
  const rows = stmtListHist.all(limit, offset);
  res.json({ ok: true, items: rows, limit, offset });
});

// ---- start
app.listen(PORT, () =>
  logger.info(`API listening on http://localhost:${PORT}`),
);
