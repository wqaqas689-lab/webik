const express = require("express");
const { MongoClient } = require("mongodb");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

app.use(express.json());
app.use(express.static("public"));

// ── Tier & mode config ────────────────────────────────────────────────────────

const TIER_POINTS = {
    ht1: 100, lt1: 90,
    ht2: 80,  lt2: 70,
    ht3: 60,  lt3: 50,
    ht4: 40,  lt4: 30,
    ht5: 20,  lt5: 10,
};

const TIER_ORDER = ["ht1","lt1","ht2","lt2","ht3","lt3","ht4","lt4","ht5","lt5"];

const GAME_MODES = [
    "spear mace",
    "dia smp",
    "sword", "mace", "axe", "spear",
    "smp", "nethpot", "dia pot",
    "uhc", "speed", "creeper", "cart", "vanilla",
];

// ── Autentisering ─────────────────────────────────────────────────────────────

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "K#9mX$vL2@pQnR7!wZ4&jY";

function requireAuth(req, res, next) {
    const password = req.headers["x-password"];
    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: "Fel lösenord" });
    }
    next();
}

// ── MongoDB ───────────────────────────────────────────────────────────────────

let db;

async function getCollection() {
    if (!db) {
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        db = client.db("tierrankings");
    }
    return db.collection("players");
}

async function loadPlayers() {
    const col = await getCollection();
    return await col.find({}, { projection: { _id: 0 } }).toArray();
}

async function savePlayers(players) {
    const col = await getCollection();
    await col.deleteMany({});
    if (players.length > 0) {
        await col.insertMany(players);
    }
}

// ── Peak tier helper ──────────────────────────────────────────────────────────

function bestTier(a, b) {
    const ai = TIER_ORDER.indexOf(a);
    const bi = TIER_ORDER.indexOf(b);
    if (ai === -1) return b;
    if (bi === -1) return a;
    return ai <= bi ? a : b;
}

// ── Parsning ──────────────────────────────────────────────────────────────────

function parseInput(text) {
    if (typeof text !== "string" || !text.trim()) {
        return { error: "Tom inmatning" };
    }

    const lower = text.toLowerCase().trim();
    const parts = lower.split(/\s+/);

    const name = parts[0];
    if (!name || name.length < 2) {
        return { error: "Spelarnamnet är för kort" };
    }

    const tier = parts.find((p) => TIER_POINTS[p]);
    if (!tier) {
        return { error: `Ogiltig tier. Giltiga: ${Object.keys(TIER_POINTS).join(", ")}` };
    }

    const mode = GAME_MODES.find((gm) => lower.includes(gm)) ?? "okänd";

    return { name, tier, mode };
}

// ── Routes ────────────────────────────────────────────────────────────────────

app.get("/api/players", async (_req, res) => {
    const players = await loadPlayers();
    res.json(players);
});

app.post("/api/add", requireAuth, async (req, res) => {
    const { text } = req.body ?? {};

    const parsed = parseInput(text);
    if (parsed.error) {
        return res.status(400).json({ error: parsed.error });
    }

    const { name, tier, mode } = parsed;

    let players = await loadPlayers();

    const existingMode = players.find((p) => p.name === name && p.mode === mode);
    if (existingMode) {
        return res.status(409).json({ error: `${name} already has a ${mode} tier (${existingMode.tier.toUpperCase()}). Use Change Tier instead.` });
    }

    const allEntries = players.filter(p => p.name === name);
    const currentPeak = allEntries.length > 0 ? allEntries[0].peakTier : null;
    const newPeak = bestTier(currentPeak, tier);

    const newPlayer = {
        id: Date.now(),
        name,
        tier,
        peakTier: newPeak,
        mode,
        points: TIER_POINTS[tier],
        retired: false,
        addedAt: new Date().toISOString(),
    };

    players.forEach(p => {
        if (p.name === name) p.peakTier = newPeak;
    });

    players.push(newPlayer);
    await savePlayers(players);

    res.status(201).json({ success: true, player: newPlayer });
});

app.post("/api/update", requireAuth, async (req, res) => {
    const { name, mode, tier } = req.body ?? {};
    if (!name || !mode || !tier) {
        return res.status(400).json({ error: "Missing name, mode or tier" });
    }
    if (!TIER_POINTS[tier]) {
        return res.status(400).json({ error: "Invalid tier" });
    }

    let players = await loadPlayers();
    const entry = players.find((p) => p.name === name && p.mode === mode);
    if (!entry) {
        return res.status(404).json({ error: `No entry found for ${name} in ${mode}` });
    }

    entry.tier = tier;
    entry.points = TIER_POINTS[tier];

    const allEntries = players.filter(p => p.name === name);
    const peak = allEntries.reduce((best, p) => bestTier(best, p.tier), allEntries[0].tier);
    players.forEach(p => {
        if (p.name === name) p.peakTier = peak;
    });

    await savePlayers(players);
    res.json({ success: true, player: entry });
});

app.post("/api/remove-tier", requireAuth, async (req, res) => {
    const { name, mode } = req.body ?? {};
    if (!name || !mode) {
        return res.status(400).json({ error: "Missing name or mode" });
    }

    let players = await loadPlayers();
    const before = players.length;
    players = players.filter((p) => !(p.name === name && p.mode === mode));

    if (players.length === before) {
        return res.status(404).json({ error: `No entry found for ${name} in ${mode}` });
    }

    await savePlayers(players);
    res.json({ success: true });
});

app.post("/api/retire", requireAuth, async (req, res) => {
    const { name, retired } = req.body ?? {};
    if (!name || typeof retired !== "boolean") {
        return res.status(400).json({ error: "Missing name or retired status" });
    }

    let players = await loadPlayers();
    const entries = players.filter(p => p.name === name);
    if (!entries.length) {
        return res.status(404).json({ error: `Player ${name} not found` });
    }

    players.forEach(p => {
        if (p.name === name) p.retired = retired;
    });

    await savePlayers(players);
    res.json({ success: true, retired });
});

app.delete("/api/players/:id", requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
        return res.status(400).json({ error: "Ogiltigt id" });
    }

    let players = await loadPlayers();
    const before = players.length;
    players = players.filter((p) => p.id !== id);

    if (players.length === before) {
        return res.status(404).json({ error: "Spelaren hittades inte" });
    }

    await savePlayers(players);
    res.json({ success: true });
});

// ── Felhantering ──────────────────────────────────────────────────────────────

app.use((_req, res) => {
    res.status(404).json({ error: "Rutten finns inte" });
});

app.use((err, _req, res, _next) => {
    console.error("Oväntat fel:", err);
    res.status(500).json({ error: "Internt serverfel" });
});

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
    console.log(`Server körs på http://localhost:${PORT}`);
});
