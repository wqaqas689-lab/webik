const express = require("express");
const fs = require("fs");
const path = require("path");
 
const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, "players.json");
 
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
 
const GAME_MODES = [
    "spear mace",   // längre fraser före kortare för korrekt matchning
    "dia smp",
    "sword", "mace", "axe", "spear",
    "smp", "nethpot", "dia pot",
    "uhc", "speed", "creeper", "cart", "vanilla",
];
 
// ── Autentisering ─────────────────────────────────────────────────────────────
 
const ADMIN_PASSWORD = "K#9mX$vL2@pQnR7!wZ4&jY";
 
function requireAuth(req, res, next) {
    const password = req.headers["x-password"];
    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: "Fel lösenord" });
    }
    next();
}
 
// ── Dataskikt ─────────────────────────────────────────────────────────────────
 
function loadPlayers() {
    try {
        if (!fs.existsSync(DB_FILE)) return [];
        const raw = fs.readFileSync(DB_FILE, "utf8");
        const data = JSON.parse(raw);
        if (!Array.isArray(data)) throw new Error("Ogiltig datastruktur");
        return data;
    } catch (err) {
        console.error("Kunde inte läsa players.json:", err.message);
        return [];
    }
}
 
function savePlayers(players) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(players, null, 2), "utf8");
    } catch (err) {
        console.error("Kunde inte spara players.json:", err.message);
        throw new Error("Kunde inte spara data");
    }
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
 
app.get("/api/players", (_req, res) => {
    const players = loadPlayers();
    res.json(players);
});
 
app.post("/api/add", requireAuth, (req, res) => {
    const { text } = req.body ?? {};
 
    const parsed = parseInput(text);
    if (parsed.error) {
        return res.status(400).json({ error: parsed.error });
    }
 
    const { name, tier, mode } = parsed;
 
    let players;
    try {
        players = loadPlayers();
    } catch {
        return res.status(500).json({ error: "Kunde inte läsa spelare" });
    }
 
    // Block if player already has ANY tier for this mode (one tier per mode per player)
    const existingMode = players.find(
        (p) => p.name === name && p.mode === mode
    );
    if (existingMode) {
        return res.status(409).json({ error: `${name} already has a ${mode} tier (${existingMode.tier.toUpperCase()}). Use Change Tier instead.` });
    }
 
    const newPlayer = {
        id: Date.now(),
        name,
        tier,
        mode,
        points: TIER_POINTS[tier],
        addedAt: new Date().toISOString(),
    };
 
    players.push(newPlayer);
 
    try {
        savePlayers(players);
    } catch {
        return res.status(500).json({ error: "Kunde inte spara spelare" });
    }
 
    res.status(201).json({ success: true, player: newPlayer });
});
 
// ── Change tier for a player's mode ──────────────────────────────────────────
 
app.post("/api/update", requireAuth, (req, res) => {
    const { name, mode, tier } = req.body ?? {};
    if (!name || !mode || !tier) {
        return res.status(400).json({ error: "Missing name, mode or tier" });
    }
    if (!TIER_POINTS[tier]) {
        return res.status(400).json({ error: "Invalid tier" });
    }
 
    let players = loadPlayers();
    const entry = players.find((p) => p.name === name && p.mode === mode);
    if (!entry) {
        return res.status(404).json({ error: `No entry found for ${name} in ${mode}` });
    }
 
    entry.tier = tier;
    entry.points = TIER_POINTS[tier];
 
    try {
        savePlayers(players);
    } catch {
        return res.status(500).json({ error: "Could not save" });
    }
 
    res.json({ success: true, player: entry });
});
 
// ── Remove a player's tier for a specific mode ────────────────────────────────
 
app.post("/api/remove-tier", requireAuth, (req, res) => {
    const { name, mode } = req.body ?? {};
    if (!name || !mode) {
        return res.status(400).json({ error: "Missing name or mode" });
    }
 
    let players = loadPlayers();
    const before = players.length;
    players = players.filter((p) => !(p.name === name && p.mode === mode));
 
    if (players.length === before) {
        return res.status(404).json({ error: `No entry found for ${name} in ${mode}` });
    }
 
    try {
        savePlayers(players);
    } catch {
        return res.status(500).json({ error: "Could not save" });
    }
 
    res.json({ success: true });
});
 
app.delete("/api/players/:id", requireAuth, (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
        return res.status(400).json({ error: "Ogiltigt id" });
    }
 
    let players = loadPlayers();
    const before = players.length;
    players = players.filter((p) => p.id !== id);
 
    if (players.length === before) {
        return res.status(404).json({ error: "Spelaren hittades inte" });
    }
 
    try {
        savePlayers(players);
    } catch {
        return res.status(500).json({ error: "Kunde inte spara ändringar" });
    }
 
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
