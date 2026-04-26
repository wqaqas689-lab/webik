const ADMIN_PASSWORD = "K#9mX$vL2@pQnR7!wZ4&jY";

const TIER_ORDER = ["ht1","lt1","ht2","lt2","ht3","lt3","ht4","lt4","ht5","lt5"];

const MODE_ICONS = {
    "sword":      "https://minecraft.wiki/images/Diamond_Sword_JE3_BE3.png",
    "axe":        "https://minecraft.wiki/images/Diamond_Axe_JE3_BE3.png",
    "smp":        "https://minecraft.wiki/images/Netherite_Chestplate_JE2_BE1.png",
    "dia smp":    "https://minecraft.wiki/images/Diamond_Chestplate_JE3_BE2.png",
    "cart":       "https://minecraft.wiki/w/Special:Redirect/file/Minecart_with_TNT.png",
    "spear mace": "https://minecraft.wiki/w/Special:Redirect/file/Diamond_Spear.png",
    "spear":      "https://minecraft.wiki/w/Special:Redirect/file/Diamond_Spear.png",
    "mace":       "https://minecraft.wiki/w/Special:Redirect/file/Mace.png",
    "vanilla":    "https://minecraft.wiki/w/Special:Redirect/file/End_Crystal.png",
    "creeper":    "https://minecraft.wiki/w/Special:Redirect/file/Creeper.png",
    "speed":      "https://minecraft.wiki/images/Potion_of_Swiftness_JE2_BE2.png",
    "dia pot":    "https://minecraft.wiki/images/Splash_Potion_of_Healing_JE2_BE2.png",
    "nethpot":    "https://minecraft.wiki/images/Splash_Potion_JE2_BE2.png",
    "uhc":        "https://minecraft.wiki/images/Golden_Apple_JE2_BE2.png",
};

const MODE_LABELS = {
    "sword":      "Sword",
    "mace":       "Mace",
    "axe":        "Axe",
    "spear":      "Spear",
    "spear mace": "Spear & Mace",
    "smp":        "SMP",
    "dia smp":    "Dia SMP",
    "nethpot":    "Netherite Pot",
    "dia pot":    "Dia Pot",
    "uhc":        "UHC",
    "speed":      "Speed",
    "creeper":    "Creeper",
    "cart":       "Cart",
    "vanilla":    "Vanilla",
};

let allPlayers = [];
let currentTab = "overall";

/* ── ADMIN ── */
function toggleAdmin() {
    document.getElementById("adminPanel").classList.toggle("hidden");
}

async function addPlayer() {
    const password = document.getElementById("passwordInput").value;
    const text = document.getElementById("playerInput").value.trim();
    if (!text) { showMsg("Enter player info", "error"); return; }

    const res = await fetch("/api/add", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-password": password },
        body: JSON.stringify({ text })
    });

    const data = await res.json();
    if (!res.ok) {
        showMsg(data.error || "Error", "error");
    } else {
        showMsg(`✓ ${data.player.name} added!`, "success");
        document.getElementById("playerInput").value = "";
        load();
    }
}

function showMsg(text, type) {
    const msg = document.getElementById("adminMsg");
    msg.textContent = text;
    msg.className = type;
}

/* ── NAV ── */
function showTab(id) {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
    const tab = document.getElementById("tab-" + id);
    if (tab) tab.classList.add("active");
    const btn = document.querySelector(`[data-tab="${id}"]`);
    if (btn) btn.classList.add("active");
    currentTab = id;
}

/* ── SEARCH ── */
function handleSearch(query) {
    const q = query.toLowerCase().trim();
    document.querySelectorAll(".rank-row").forEach(row => {
        const name = row.querySelector(".player-name")?.textContent.toLowerCase() || "";
        row.style.display = (!q || name.includes(q)) ? "" : "none";
    });
}

/* ── HELPERS ── */
function tierClass(tier) { return tier ? "tier-" + tier.toLowerCase() : ""; }

function rankClass(i) {
    if (i === 0) return "gold";
    if (i === 1) return "silver";
    if (i === 2) return "bronze";
    return "";
}

function topClass(i) {
    if (i === 0) return "top1";
    if (i === 1) return "top2";
    if (i === 2) return "top3";
    return "";
}

/* Full body skin */
function skinUrl(name) {
    return `https://mc-heads.net/body/${encodeURIComponent(name)}/100`;
}
/* Head only — used in mode cards */
function avatarUrl(name) {
    return `https://mc-heads.net/avatar/${encodeURIComponent(name)}/40`;
}

function modeIconImg(mode, size = 24) {
    const src = MODE_ICONS[mode];
    if (!src) return `<span style="font-size:${Math.round(size*0.7)}px;opacity:0.5">?</span>`;
    return `<img class="mode-icon-img" src="${src}" width="${size}" height="${size}" alt="${mode}" onerror="this.style.display='none'">`;
}

function modeLabel(mode) {
    return MODE_LABELS[mode] || (mode ? mode.charAt(0).toUpperCase() + mode.slice(1) : "Unknown");
}

/* ── SPARKLES for top 3 ── */
function addSparkles(row, rank) {
    // rank 0 = gold (most), 1 = silver (medium), 2 = bronze (subtle)
    const counts = [9, 5, 3];
    const colors = {
        0: ['#ffd700','#ffe55a','#fff0a0'],
        1: ['#c8d8e8','#e0eaf4','#a0b8cc'],
        2: ['#cd7f32','#e8a060','#f0c080'],
    };
    const n = counts[rank];
    const cols = colors[rank];

    for (let i = 0; i < n; i++) {
        const s = document.createElement('span');
        s.className = 'spark';
        const angle = Math.random() * Math.PI * 2;
        const dist = 30 + Math.random() * 90;
        s.style.cssText = `
            left: ${10 + Math.random() * 80}%;
            top: ${10 + Math.random() * 80}%;
            background: ${cols[Math.floor(Math.random() * cols.length)]};
            --tx: ${Math.cos(angle) * dist}px;
            --ty: ${Math.sin(angle) * dist}px;
            --dur: ${1.8 + Math.random() * 2.4}s;
            --delay: ${Math.random() * 2.5}s;
            width: ${rank === 0 ? 3 : 2}px;
            height: ${rank === 0 ? 3 : 2}px;
            box-shadow: 0 0 ${rank === 0 ? 5 : 3}px 1px ${cols[0]}99;
        `;
        row.appendChild(s);
    }
}

/* ── STATS BAR ── */
function renderStatsBar(players) {
    const bar = document.getElementById("statsBar");
    if (!bar) return;
    const byName = groupByName(players);
    const sorted = Object.values(byName).sort((a, b) => b.points - a.points);
    const modes = [...new Set(players.map(p => p.mode))].filter(Boolean);
    const ht1Count = players.filter(p => p.tier === "ht1").length;

    bar.innerHTML = `
        <div class="stat-card">
            <div class="stat-label">Players</div>
            <div class="stat-value">${sorted.length}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Modes</div>
            <div class="stat-value">${modes.length}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">HT1 Players</div>
            <div class="stat-value">${ht1Count}</div>
        </div>
        ${sorted[0] ? `
        <div class="stat-card">
            <div class="stat-label">Top Player</div>
            <div class="stat-value" style="font-size:18px">${sorted[0].name}</div>
        </div>` : ""}
    `;
}

/* ── GROUP BY NAME ── */
function groupByName(players) {
    const byName = {};
    players.forEach(p => {
        if (!p || !p.name) return;
        if (!byName[p.name]) byName[p.name] = { name: p.name, points: 0, tiers: [] };
        byName[p.name].points += (p.points || 0);
        byName[p.name].tiers.push({ tier: p.tier, mode: p.mode });
    });
    return byName;
}

/* ── OVERALL ── */
function renderOverall(players) {
    const list = document.getElementById("overallList");
    list.innerHTML = "";

    const byName = groupByName(players);
    const sorted = Object.values(byName).sort((a, b) => b.points - a.points);

    const countEl = document.getElementById("totalPlayerCount");
    if (countEl) countEl.textContent = sorted.length;
    renderStatsBar(players);

    if (!sorted.length) {
        list.innerHTML = `<div class="empty">No players yet.</div>`;
        return;
    }

    sorted.forEach((p, i) => {
        const rc = rankClass(i);
        const tc = topClass(i);

        const tierTags = p.tiers
            .filter(t => t.tier)
            .sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier))
            .map(t => `
                <span class="tier-tag ${tierClass(t.tier)}" title="${modeLabel(t.mode)}">
                    ${modeIconImg(t.mode, 13)}
                    ${t.tier.toUpperCase()}
                </span>`)
            .join("");

        const row = document.createElement("div");
        row.className = `rank-row ${tc}`;
        row.style.animationDelay = `${i * 35}ms`;
        row.innerHTML = `
            <div class="rank-num ${rc}">${i + 1}</div>
            <div class="player-info">
                <img class="player-avatar"
                     src="${skinUrl(p.name)}"
                     alt="${p.name}"
                     onerror="this.src='${avatarUrl(p.name)}'">
                <span class="player-name">${p.name}</span>
            </div>
            <div class="points-badge">${p.points} pts</div>
            <div class="tier-tags">${tierTags || '<span style="color:var(--muted2);font-size:12px">—</span>'}</div>
        `;

        // Add sparkles for top 3
        if (i < 3) addSparkles(row, i);

        list.appendChild(row);
    });
}

/* ── MODE TABS ── */
function renderModes(players) {
    const nav = document.getElementById("modeNav");
    const modeTabs = document.getElementById("modeTabs");

    nav.querySelectorAll("[data-tab]").forEach(b => {
        if (b.dataset.tab !== "overall") b.remove();
    });
    modeTabs.innerHTML = "";

    const modes = [...new Set(players.map(p => p.mode))].filter(m => m && m !== "okänd" && m !== "unknown");

    modes.forEach(mode => {
        const label = modeLabel(mode);

        const btn = document.createElement("button");
        btn.className = "nav-btn";
        btn.dataset.tab = "mode-" + mode;
        btn.innerHTML = `${modeIconImg(mode, 18)}<span>${label}</span>`;
        btn.onclick = () => showTab("mode-" + mode);
        nav.appendChild(btn);

        const tab = document.createElement("div");
        tab.className = "tab";
        tab.id = "tab-mode-" + mode;

        const modePlayers = players
            .filter(p => p.mode === mode && p.tier)
            .sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier));

        const cards = modePlayers.map((p, i) => {
            const rc = rankClass(i);
            const tc = topClass(i);
            return `
                <div class="mode-card ${tc}" style="animation-delay:${i*35}ms">
                    <div class="mode-rank ${rc}">${i + 1}</div>
                    <img class="player-avatar" src="${avatarUrl(p.name)}" alt="${p.name}">
                    <span class="player-name">${p.name}</span>
                    <span class="tier-tag ${tierClass(p.tier)}">${p.tier.toUpperCase()}</span>
                </div>
            `;
        }).join("");

        tab.innerHTML = `
            <div class="page-header">
                <div class="page-header-left">
                    ${modeIconImg(mode, 44)}
                    <div>
                        <h1>${label.toUpperCase()}</h1>
                        <p class="subtitle">${modePlayers.length} player${modePlayers.length !== 1 ? "s" : ""} ranked</p>
                    </div>
                </div>
                <div class="player-count-badge"><span>${modePlayers.length}</span> ranked</div>
            </div>
            <div class="mode-grid">${cards || '<div class="empty">No players ranked yet.</div>'}</div>
        `;

        modeTabs.appendChild(tab);
    });
}

/* ── LOAD ── */
async function load() {
    try {
        const res = await fetch("/api/players");
        allPlayers = await res.json();
        renderOverall(allPlayers);
        renderModes(allPlayers);
    } catch (e) {
        console.error("Could not load players:", e);
    }
}

load();
