import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
  ComposedChart, Line, LineChart, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  RadialBarChart, RadialBar, PieChart, Pie,
} from "recharts";
import {
  Flag, TrendingUp, TrendingDown, AlertTriangle, Info, ChevronDown,
  Play, Download, CloudRain, Sun, CloudSun, Wind, Droplets, BarChart3,
  Settings as SettingsIcon, ArrowLeftRight, Trophy, Gauge, Timer, MapPin,
  RefreshCw, Loader2, Thermometer, LayoutDashboard, Zap, Image as ImageIcon, History,
  Moon, SlidersHorizontal, Database, GitCompare,
} from "lucide-react";

/**
 * F1 PREDICTOR 2026 — dashboard shell
 * ----------------------------------------------------------------
 * Light theme matching the existing product: white cards on a light
 * page, official F1 red (#E10600) as the single accent, a navy
 * "Track Conditions" widget. One deliberate exception: the "Purple
 * Pick" badge on the top result keeps FIA broadcast-purple, because
 * that colour means something specific in real F1 graphics (fastest
 * sector/lap) — it isn't a theme colour, it's a signal.
 *
 * Every number is deterministic MOCK data (computeField / computePace /
 * circuitHistory / seededRandom) standing in for a real inference API.
 * Swap the relevant function body for a fetch call and keep the same
 * return shape — nothing else needs to change.
 *
 * IMAGE SLOTS: every dashed box (ImagePlaceholder / ImgSlot) is a
 * marked spot to drop real artwork — hero banner, driver headshots,
 * team logos, circuit map. Replace the placeholder's contents with an
 * <img src="..." /> (or a CSS background-image) and remove the dashed
 * border style.
 *
 * CHARTS: built with Recharts (the supported charting library in this
 * artifact sandbox — react-plotly.js pulls in plotly.js-dist-min, which
 * isn't in the supported bundle, so it fails to load here).
 */

const PALETTE_LIGHT = {
  red: "#E10600", redDark: "#B80500", redTint: "#FDEDEC",
  bg: "#F4F5F7", surface: "#FFFFFF", surfaceAlt: "#EEF0F3", border: "#E3E5EA",
  text: "#15151E", sub: "#6B7280", muted: "#9AA0AC",
  navy: "#16233F", navyLight: "#22345A",
  purple: "#9D4EDD", purpleTint: "#F4EBFC",
  green: "#1DA36B", amber: "#D97B0A", gridline: "#ECEDF1",
};
const PALETTE_DARK = {
  red: "#FF3B30", redDark: "#E8002D", redTint: "rgba(255,59,48,0.14)",
  bg: "#0A0C10", surface: "#15181F", surfaceAlt: "#1C2028", border: "#2B3039",
  text: "#F1F2F5", sub: "#9BA2AF", muted: "#6B7280",
  navy: "#0D1526", navyLight: "#16233F",
  purple: "#B983F2", purpleTint: "rgba(157,78,221,0.2)",
  green: "#2ECC8F", amber: "#F0A93B", gridline: "#2B3039",
};
let _theme = "light";
function setGlobalTheme(name) { _theme = name === "dark" ? "dark" : "light"; }
let _apiConfig = { season: 2026, forceSimulated: false };
function setGlobalApiConfig(cfg) { _apiConfig = { ..._apiConfig, ...cfg }; }
// Live-lookup proxy: every C.xxx access anywhere in this file always reads
// from whichever palette is currently active — no prop drilling, no context.
const C = new Proxy({}, { get: (_, prop) => (_theme === "dark" ? PALETTE_DARK : PALETTE_LIGHT)[prop] });

// ===========================================================================
// DATA — 2026 grid (11 teams / 22 drivers). Colors/attributes illustrative.
// ===========================================================================
// Strength values calibrated against REAL 2026 championship standings after
// Round 11 (Hungarian GP, 26 Jul 2026): Antonelli 219pts, Hamilton 169,
// Russell 160, Leclerc 138, Norris 128, Verstappen 93, Piastri 92, Hadjar 84
// (source: RacingNews365/Total-Motorsport/GPBlog, checked 28 Jul 2026).
// Mapped via strength = 35 + 62·sqrt(points / 219) so the model isn't
// arbitrarily biased toward any one driver — it reflects who is actually
// leading right now. Midfield/backmarker teams (no individual points
// confirmed) are informed estimates consistent with reported facts (Audi
// overtook Williams on 12pts; Racing Bulls lead Alpine by ~5pts).
const TEAMS = [
  { id: "mclaren", name: "McLaren", color: "#FF8000", drivers: [
    { code: "NOR", name: "Lando Norris", number: 4, strength: 82, reliability: 92, wetSkill: 78 },
    { code: "PIA", name: "Oscar Piastri", number: 81, strength: 75, reliability: 82, wetSkill: 70 },
  ]},
  { id: "ferrari", name: "Ferrari", color: "#E8002D", drivers: [
    { code: "LEC", name: "Charles Leclerc", number: 16, strength: 84, reliability: 85, wetSkill: 74 },
    { code: "HAM", name: "Lewis Hamilton", number: 44, strength: 89, reliability: 84, wetSkill: 88 },
  ]},
  { id: "redbull", name: "Red Bull Racing", color: "#3671C6", drivers: [
    { code: "VER", name: "Max Verstappen", number: 1, strength: 75, reliability: 88, wetSkill: 90 },
    { code: "HAD", name: "Isack Hadjar", number: 6, strength: 73, reliability: 80, wetSkill: 60 },
  ]},
  { id: "mercedes", name: "Mercedes", color: "#00A19B", drivers: [
    { code: "RUS", name: "George Russell", number: 63, strength: 88, reliability: 90, wetSkill: 75 },
    { code: "ANT", name: "Kimi Antonelli", number: 12, strength: 97, reliability: 83, wetSkill: 65 },
  ]},
  { id: "astonmartin", name: "Aston Martin", color: "#229971", drivers: [
    { code: "ALO", name: "Fernando Alonso", number: 14, strength: 55, reliability: 82, wetSkill: 92 },
    { code: "STR", name: "Lance Stroll", number: 18, strength: 50, reliability: 78, wetSkill: 68 },
  ]},
  { id: "williams", name: "Williams", color: "#1E6FCE", drivers: [
    { code: "SAI", name: "Carlos Sainz", number: 55, strength: 46, reliability: 81, wetSkill: 80 },
    { code: "ALB", name: "Alex Albon", number: 23, strength: 42, reliability: 83, wetSkill: 72 },
  ]},
  { id: "audi", name: "Audi", color: "#BB0A30", drivers: [
    { code: "HUL", name: "Nico Hülkenberg", number: 27, strength: 41, reliability: 74, wetSkill: 70 },
    { code: "BOR", name: "Gabriel Bortoleto", number: 5, strength: 48, reliability: 70, wetSkill: 60 },
  ]},
  { id: "alpine", name: "Alpine", color: "#0090FF", drivers: [
    { code: "GAS", name: "Pierre Gasly", number: 10, strength: 49, reliability: 76, wetSkill: 74 },
    { code: "COL", name: "Franco Colapinto", number: 43, strength: 43, reliability: 69, wetSkill: 62 },
  ]},
  { id: "haas", name: "Haas", color: "#9198A1", drivers: [
    { code: "OCO", name: "Esteban Ocon", number: 31, strength: 44, reliability: 77, wetSkill: 71 },
    { code: "BEA", name: "Oliver Bearman", number: 87, strength: 42, reliability: 73, wetSkill: 63 },
  ]},
  { id: "racingbulls", name: "Racing Bulls", color: "#3F5FCC", drivers: [
    { code: "LAW", name: "Liam Lawson", number: 30, strength: 51, reliability: 75, wetSkill: 68 },
    { code: "LIN", name: "Arvid Lindblad", number: 41, strength: 45, reliability: 68, wetSkill: 55 },
  ]},
  { id: "cadillac", name: "Cadillac", color: "#9C7A19", drivers: [
    { code: "PER", name: "Sergio Pérez", number: 11, strength: 41, reliability: 66, wetSkill: 66 },
    { code: "BOT", name: "Valtteri Bottas", number: 77, strength: 39, reliability: 70, wetSkill: 69 },
  ]},
];

const FLAT_DRIVERS = TEAMS.flatMap((t) =>
  t.drivers.map((d) => ({ ...d, teamId: t.id, teamName: t.name, color: t.color }))
);

const TARGETS = [
  { id: "winner", label: "Race Winner", short: "WIN", sum: 1, exp: 5.6, accuracy: 0.58, session: "race",
    note: "Exact winner is the hardest honest target — chaos (safety cars, contact, strategy) dominates." },
  { id: "podium", label: "Podium (Top 3)", short: "PODIUM", sum: 3, exp: 3.0, accuracy: 0.89, session: "race",
    note: "Highest-accuracy race target: the fastest 3-4 cars usually supply the podium most weekends." },
  { id: "points", label: "Points (Top 10)", short: "POINTS", sum: 10, exp: 1.8, accuracy: 0.81, session: "race",
    note: "Wide enough margin to absorb one bad session per driver, still tight enough to be useful." },
  { id: "q3", label: "Qualifying Q3", short: "Q3", sum: 10, exp: 1.6, accuracy: 0.74, session: "qualifying",
    note: "Pure pace, no race-day chaos — but low fuel + track evolution add noise session to session." },
];

// Verified 2026 FIA Formula One World Championship calendar, as confirmed by
// Formula1.com, ESPN, Sky Sports and Motorsport.com (checked late July 2026).
// The Bahrain and Saudi Arabian Grands Prix (originally rounds 4-5, April)
// were cancelled after the season started due to the regional conflict in
// the Middle East; Bahrain's round was later reinstated at Sepang,
// Malaysia (2-4 Oct), returning the season to 23 rounds. Circuit specs
// (laps/length) are real; weather/safety-car/temperature baselines are
// illustrative estimates informed by each venue's known climate and history.
// `status`: "completed" | "upcoming" | "cancelled" (relative to 28 Jul 2026).
const CALENDAR_FULL = [
  { id: "au", round: 1, name: "Australian Grand Prix", circuit: "Albert Park Circuit", location: "Melbourne", flag: "🇦🇺", date: "Mar 6-8", laps: 58, lengthKm: 5.278, drs: 4, overtaking: "Medium", baseRain: 20, baseSC: 55, baseTemp: 24, status: "completed" },
  { id: "cn", round: 2, name: "Chinese Grand Prix", circuit: "Shanghai International Circuit", location: "Shanghai", flag: "🇨🇳", date: "Mar 13-15", laps: 56, lengthKm: 5.451, drs: 2, overtaking: "Medium", baseRain: 15, baseSC: 35, baseTemp: 22, status: "completed", sprint: true },
  { id: "jp", round: 3, name: "Japanese Grand Prix", circuit: "Suzuka International Racing Course", location: "Suzuka", flag: "🇯🇵", date: "Mar 27-29", laps: 53, lengthKm: 5.807, drs: 1, overtaking: "Low", baseRain: 20, baseSC: 30, baseTemp: 19, status: "completed" },
  { id: "bh", round: null, name: "Bahrain Grand Prix", circuit: "Bahrain International Circuit", location: "Sakhir", flag: "🇧🇭", date: "Apr 10-12", laps: 57, lengthKm: 5.412, drs: 3, overtaking: "High", baseRain: 1, baseSC: 25, baseTemp: 34, status: "cancelled", note: "Cancelled — regional conflict in the Middle East." },
  { id: "sa", round: null, name: "Saudi Arabian Grand Prix", circuit: "Jeddah Corniche Circuit", location: "Jeddah", flag: "🇸🇦", date: "Apr 17-19", laps: 50, lengthKm: 6.174, drs: 3, overtaking: "Medium", baseRain: 1, baseSC: 45, baseTemp: 30, status: "cancelled", note: "Cancelled — regional conflict in the Middle East." },
  { id: "mi", round: 4, name: "Miami Grand Prix", circuit: "Miami International Autodrome", location: "Miami Gardens", flag: "🇺🇸", date: "May 1-3", laps: 57, lengthKm: 5.412, drs: 3, overtaking: "Medium", baseRain: 30, baseSC: 40, baseTemp: 29, status: "completed", sprint: true },
  { id: "ca", round: 5, name: "Canadian Grand Prix", circuit: "Circuit Gilles Villeneuve", location: "Montreal", flag: "🇨🇦", date: "May 22-24", laps: 70, lengthKm: 4.361, drs: 2, overtaking: "High", baseRain: 25, baseSC: 45, baseTemp: 20, status: "completed", sprint: true },
  { id: "mc", round: 6, name: "Monaco Grand Prix", circuit: "Circuit de Monaco", location: "Monte Carlo", flag: "🇲🇨", date: "Jun 5-7", laps: 78, lengthKm: 3.337, drs: 1, overtaking: "Low", baseRain: 10, baseSC: 60, baseTemp: 23, status: "completed" },
  { id: "es", round: 7, name: "Spanish Grand Prix", circuit: "Circuit de Barcelona-Catalunya", location: "Barcelona", flag: "🇪🇸", date: "Jun 12-14", laps: 66, lengthKm: 4.657, drs: 2, overtaking: "Medium", baseRain: 12, baseSC: 20, baseTemp: 27, status: "completed" },
  { id: "at", round: 8, name: "Austrian Grand Prix", circuit: "Red Bull Ring", location: "Spielberg", flag: "🇦🇹", date: "Jun 26-28", laps: 71, lengthKm: 4.318, drs: 3, overtaking: "Medium", baseRain: 20, baseSC: 20, baseTemp: 24, status: "completed" },
  { id: "gb", round: 9, name: "British Grand Prix", circuit: "Silverstone Circuit", location: "Silverstone", flag: "🇬🇧", date: "Jul 3-5", laps: 52, lengthKm: 5.891, drs: 2, overtaking: "Medium", baseRain: 35, baseSC: 20, baseTemp: 20, status: "completed", sprint: true },
  { id: "be", round: 10, name: "Belgian Grand Prix", circuit: "Circuit de Spa-Francorchamps", location: "Spa", flag: "🇧🇪", date: "Jul 17-19", laps: 44, lengthKm: 7.004, drs: 2, overtaking: "High", baseRain: 45, baseSC: 25, baseTemp: 18, status: "completed" },
  { id: "hu", round: 11, name: "Hungarian Grand Prix", circuit: "Hungaroring", location: "Budapest", flag: "🇭🇺", date: "Jul 24-26", laps: 70, lengthKm: 4.381, drs: 1, overtaking: "Low", baseRain: 15, baseSC: 15, baseTemp: 27, status: "completed" },
  { id: "nl", round: 12, name: "Dutch Grand Prix", circuit: "Circuit Zandvoort", location: "Zandvoort", flag: "🇳🇱", date: "Aug 21-23", laps: 72, lengthKm: 4.259, drs: 2, overtaking: "Low", baseRain: 30, baseSC: 20, baseTemp: 19, status: "upcoming", sprint: true, note: "Final scheduled Zandvoort appearance on the current calendar." },
  { id: "it", round: 13, name: "Italian Grand Prix", circuit: "Autodromo Nazionale Monza", location: "Monza", flag: "🇮🇹", date: "Sep 4-6", laps: 53, lengthKm: 5.793, drs: 2, overtaking: "High", baseRain: 20, baseSC: 15, baseTemp: 25, status: "upcoming" },
  { id: "mad", round: 14, name: "Spanish Grand Prix (Madrid)", circuit: "Madring", location: "Madrid", flag: "🇪🇸", date: "Sep 11-13", laps: 57, lengthKm: 5.416, drs: 2, overtaking: "Medium", baseRain: 10, baseSC: 40, baseTemp: 26, status: "upcoming", note: "Debut venue — Spain's 2nd race in 2026 alongside Barcelona; specs may be revised after homologation." },
  { id: "az", round: 15, name: "Azerbaijan Grand Prix", circuit: "Baku City Circuit", location: "Baku", flag: "🇦🇿", date: "Sep 25-27", laps: 51, lengthKm: 6.003, drs: 2, overtaking: "High", baseRain: 10, baseSC: 55, baseTemp: 24, status: "upcoming" },
  { id: "my", round: 16, name: "Bahrain Grand Prix in Malaysia", circuit: "Sepang International Circuit", location: "Sepang", flag: "🇲🇾", date: "Oct 2-4", laps: 56, lengthKm: 5.543, drs: 2, overtaking: "Medium", baseRain: 55, baseSC: 30, baseTemp: 32, status: "upcoming", note: "New for 2026 — Bahrain GP relocated to Sepang after the Sakhir round was cancelled." },
  { id: "sg", round: 17, name: "Singapore Grand Prix", circuit: "Marina Bay Street Circuit", location: "Singapore", flag: "🇸🇬", date: "Oct 9-11", laps: 62, lengthKm: 4.940, drs: 2, overtaking: "Medium", baseRain: 40, baseSC: 65, baseTemp: 30, status: "upcoming", sprint: true },
  { id: "us", round: 18, name: "United States Grand Prix", circuit: "Circuit of the Americas", location: "Austin", flag: "🇺🇸", date: "Oct 23-25", laps: 56, lengthKm: 5.513, drs: 2, overtaking: "High", baseRain: 20, baseSC: 25, baseTemp: 24, status: "upcoming" },
  { id: "mx", round: 19, name: "Mexico City Grand Prix", circuit: "Autódromo Hermanos Rodríguez", location: "Mexico City", flag: "🇲🇽", date: "Oct 30-Nov 1", laps: 71, lengthKm: 4.304, drs: 3, overtaking: "Medium", baseRain: 10, baseSC: 30, baseTemp: 22, status: "upcoming" },
  { id: "br", round: 20, name: "São Paulo Grand Prix", circuit: "Autódromo José Carlos Pace (Interlagos)", location: "São Paulo", flag: "🇧🇷", date: "Nov 6-8", laps: 71, lengthKm: 4.309, drs: 2, overtaking: "High", baseRain: 45, baseSC: 40, baseTemp: 23, status: "upcoming" },
  { id: "lv", round: 21, name: "Las Vegas Grand Prix", circuit: "Las Vegas Strip Circuit", location: "Las Vegas", flag: "🇺🇸", date: "Nov 19-21", laps: 50, lengthKm: 6.201, drs: 2, overtaking: "Medium", baseRain: 5, baseSC: 35, baseTemp: 12, status: "upcoming" },
  { id: "qa", round: 22, name: "Qatar Grand Prix", circuit: "Lusail International Circuit", location: "Lusail", flag: "🇶🇦", date: "Nov 27-29", laps: 57, lengthKm: 5.380, drs: 2, overtaking: "Medium", baseRain: 2, baseSC: 25, baseTemp: 28, status: "upcoming" },
  { id: "ad", round: 23, name: "Abu Dhabi Grand Prix", circuit: "Yas Marina Circuit", location: "Abu Dhabi", flag: "🇦🇪", date: "Dec 4-6", laps: 58, lengthKm: 5.281, drs: 2, overtaking: "Medium", baseRain: 2, baseSC: 20, baseTemp: 27, status: "upcoming", note: "Season finale." },
];
const CALENDAR = CALENDAR_FULL.filter((r) => r.status !== "cancelled");

const SESSIONS = [
  { id: "practice", label: "Friday Practice", icon: "🏁", desc: "FP1 · FP2 · FP3 lap-time forecasts, tyre degradation & consistency analysis", sub: ["FP1", "FP2", "FP3"] },
  { id: "qualifying", label: "Saturday Qualifying", icon: "⚡", desc: "Q1/Q2/Q3 elimination predictions, pole position & grid penalty impact", sub: ["Q1", "Q2", "Q3"] },
  { id: "race", label: "Sunday Grand Prix", icon: "🏆", desc: "Full race prediction with podium, DNF risk, points & championship impact", sub: ["Race"] },
];

// Sprint weekends (flagged `sprint: true` in CALENDAR) replace the usual
// Friday/Saturday format: FP1 only on Friday, then Sprint Qualifying + the
// Sprint itself + full Qualifying all on Saturday.
function getSubSessions(sessionId, race) {
  const def = SESSIONS.find((s) => s.id === sessionId);
  if (race?.sprint && sessionId === "practice") return ["FP1"];
  if (race?.sprint && sessionId === "qualifying") return ["Sprint Quali", "Sprint Race", "Q1", "Q2", "Q3"];
  return def.sub;
}
function sessionDesc(sessionId, race) {
  if (race?.sprint && sessionId === "practice") return "Sprint weekend: only FP1 — lap-time forecast & tyre read before Sprint Qualifying.";
  if (race?.sprint && sessionId === "qualifying") return "Sprint weekend: Sprint Qualifying, the Sprint race itself, then full Q1/Q2/Q3 for Sunday's grid.";
  return SESSIONS.find((s) => s.id === sessionId).desc;
}

// ===========================================================================
// DETERMINISTIC HELPERS (stand in for a real model / API call)
// ===========================================================================
function seededRandom(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return ((h >>> 0) % 1000) / 1000;
}
function clamp(n) { return Math.max(5, Math.min(98, Math.round(n))); }

function effectiveStrength(d, weather, wetInfluence = 50) {
  if (weather === "dry") return d.strength;
  const scale = wetInfluence / 50; // 50 = baseline (reproduces original 0.55/0.28)
  const wetWeight = Math.max(0, Math.min(0.9, (weather === "wet" ? 0.55 : 0.28) * scale));
  return d.strength * (1 - wetWeight) + d.wetSkill * wetWeight;
}

function computeField(targetId, seedKey, weather, chaosLevel = 50, wetInfluence = 50, reliabilityInfluence = 50, gridPositions = null, gridWeight = 55) {
  const target = TARGETS.find((t) => t.id === targetId);
  const seed = seedKey || "default";
  // chaosLevel 0 = "dominant favourites" (sharper concentration), 100 = "chaotic"
  // (flatter, more upset-prone). 50 reproduces the target's own baseline exponent.
  const chaosFactor = Math.max(0.35, 1.6 - (chaosLevel / 100) * 1.2);
  const effExp = target.exp * chaosFactor;
  const strengths = FLAT_DRIVERS.map((d) => effectiveStrength(d, weather, wetInfluence) + (seededRandom(d.code + seed) - 0.5) * 6);
  const scores = strengths.map((s, i) => {
    const base = Math.pow(Math.max(1, s) / 100, effExp);
    if (!gridPositions || target.session !== "race") return base;
    const grid = gridPositions[FLAT_DRIVERS[i].code];
    const mult = gridPriorMultiplier(grid);
    const blended = 1 + (mult - 1) * (gridWeight / 100); // gridWeight 0 = ignore grid entirely, 100 = full empirical weight
    return base * Math.max(0.1, blended);
  });
  const total = scores.reduce((a, b) => a + b, 0);
  const relScale = reliabilityInfluence / 50; // 50 = baseline
  return FLAT_DRIVERS
    .map((d, i) => {
      const prob = Math.min(0.97, (scores[i] / total) * target.sum);
      const delta = (seededRandom(d.code + target.id + seed) - 0.5) * 6;
      const riskScore = (100 - d.reliability) * relScale + (weather !== "dry" ? 6 : 0);
      const dnfRisk = riskScore < 20 ? "Low" : riskScore < 32 ? "Medium" : "High";
      const form = [0, 1, 2, 3, 4].map((i2) => {
        const r = seededRandom(d.code + "form" + i2);
        const base = 21 - Math.round((d.strength / 100) * 20);
        return Math.max(1, Math.min(20, Math.round(base + (r - 0.5) * 8)));
      });
      return { ...d, prob, delta, dnfRisk, form, grid: gridPositions ? gridPositions[d.code] : undefined };
    })
    .sort((a, b) => b.prob - a.prob);
}

function computePace(raceId, weather, subSession, wetInfluence = 50) {
  const seed = (raceId || "default") + (subSession || "");
  const strengths = FLAT_DRIVERS.map((d) => effectiveStrength(d, weather, wetInfluence) + (seededRandom(d.code + "pace" + seed) - 0.5) * 5);
  const top = Math.max(...strengths);
  return FLAT_DRIVERS
    .map((d, i) => {
      const gap = (top - strengths[i]) * 0.021;
      const degScore = 100 - d.reliability + (seededRandom(d.code + "deg" + seed) - 0.5) * 20;
      const tyreDeg = degScore < 22 ? "Low" : degScore < 34 ? "Medium" : "High";
      const form = [0, 1, 2, 3, 4].map((i2) => {
        const r = seededRandom(d.code + "form" + i2);
        const base = 21 - Math.round((d.strength / 100) * 20);
        return Math.max(1, Math.min(20, Math.round(base + (r - 0.5) * 8)));
      });
      return { ...d, gap, tyreDeg, form };
    })
    .sort((a, b) => a.gap - b.gap);
}

// Synthetic circuit history: how the CURRENT 2026 grid would have fared in the
// last 3 simulated visits to this circuit. Explicitly NOT a claim about real
// past results (drivers/teams change year to year) — a backtest flavour, not
// a fact. Swap for a real Jolpica/FastF1 archive query when wiring the API.
function circuitHistory(raceId) {
  const years = [2023, 2024, 2025];
  return years.map((y) => {
    const seed = `${raceId}-${y}`;
    const f = computeField("podium", seed, "dry");
    const safetyCars = Math.round(seededRandom(seed + "sc") * 3);
    const overtakes = Math.round(8 + seededRandom(seed + "ot") * 30);
    return { year: y, winner: f[0], second: f[1], third: f[2], safetyCars, overtakes };
  });
}

// Illustrative drivers' championship — cumulative points built up round by
// round across the CALENDAR sample, weighted by strength with per-round noise.
function driversStandings() {
  const rows = FLAT_DRIVERS.map((d) => ({ ...d, points: 0 }));
  CALENDAR.forEach((race) => {
    rows.forEach((d) => {
      const base = (d.strength / 100) * 21;
      const noise = (seededRandom(d.code + race.id + "pts") - 0.35) * 9;
      d.points += Math.max(0, Math.round(base + noise));
    });
  });
  return rows
    .map((d) => ({ ...d, delta: (seededRandom(d.code + "trend") - 0.45) * 8 }))
    .sort((a, b) => b.points - a.points);
}

// Cumulative points progression for the top N drivers, round by round —
// the classic "championship battle" chart.
function pointsProgression(topN = 6) {
  const top = [...FLAT_DRIVERS].sort((a, b) => b.strength - a.strength).slice(0, topN);
  const cumulative = Object.fromEntries(top.map((d) => [d.code, 0]));
  const rows = CALENDAR.map((race) => {
    const row = { round: `R${race.round}` };
    top.forEach((d) => {
      const base = (d.strength / 100) * 21;
      const noise = (seededRandom(d.code + race.id + "pts") - 0.35) * 9;
      cumulative[d.code] += Math.max(0, Math.round(base + noise));
      row[d.code] = cumulative[d.code];
    });
    return row;
  });
  return { rows, drivers: top };
}

// Synthetic "recent results" strip for the last few calendar rounds.
function recentResults(n = 3) {
  return CALENDAR.slice(-n).map((race) => ({
    race,
    podium: computeField("podium", race.id + "-result", "dry").slice(0, 3),
  }));
}

function subAttributes(d) {
  const j = (k) => (seededRandom(d.code + k) - 0.5) * 8;
  return {
    pace: clamp(d.strength + j("p")),
    racecraft: clamp(d.strength * 0.55 + d.reliability * 0.2 + d.wetSkill * 0.15 + j("r")),
    consistency: clamp(d.reliability + j("c")),
    wet: clamp(d.wetSkill + j("w")),
    tyre: clamp(d.reliability * 0.7 + d.strength * 0.3 + j("t")),
  };
}

function h2hProb(a, b) {
  const diff = a.strength - b.strength;
  return 1 / (1 + Math.pow(10, -diff / 14));
}

function riskColor(level) { return { Low: C.green, Medium: C.amber, High: C.red }[level]; }

// Official Pirelli compound colour coding, as used on F1 broadcast graphics.
const TYRES = {
  Soft: { color: "#DA291C", label: "Soft" },
  Medium: { color: "#F5D033", label: "Medium" },
  Hard: { color: "#F2F2F2", label: "Hard", outline: "#9AA0AC" },
  Intermediate: { color: "#43A047", label: "Intermediate" },
  Wet: { color: "#1E88E5", label: "Wet" },
};
function compoundForWeather(weather) {
  return weather === "wet" ? "Wet" : weather === "mixed" ? "Intermediate" : "Medium";
}
// Deterministic 1-stop / 2-stop predicted strategy for a driver at a given race.
function predictedStrategy(d, race, weather, seedKey, strategyAggressiveness = 50) {
  const laps = race.laps;
  const twoStopThreshold = 0.65 - (strategyAggressiveness / 100) * 0.4; // higher aggressiveness → lower bar to clear → more 2-stops
  const twoStop = seededRandom(d.code + seedKey + "strat") > twoStopThreshold;
  const start = weather !== "dry" ? "Intermediate" : (seededRandom(d.code + "start") > 0.5 ? "Medium" : "Soft");
  if (weather !== "dry") {
    const split = Math.round(laps * (0.45 + seededRandom(d.code + "split") * 0.15));
    return [{ compound: start, laps: split }, { compound: "Wet", laps: laps - split }];
  }
  if (twoStop) {
    const s1 = Math.round(laps * (0.28 + seededRandom(d.code + "s1") * 0.08));
    const s2 = Math.round(laps * (0.32 + seededRandom(d.code + "s2") * 0.08));
    return [{ compound: start, laps: s1 }, { compound: "Medium", laps: s2 }, { compound: "Hard", laps: Math.max(1, laps - s1 - s2) }];
  }
  const s1 = Math.round(laps * (0.35 + seededRandom(d.code + "s1b") * 0.1));
  return [{ compound: start, laps: s1 }, { compound: "Hard", laps: Math.max(1, laps - s1) }];
}

function ordinal(n) {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function formatCountdown(totalSeconds) {
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return d > 0 ? `${d}d ${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function exportCSV(rows, filename) {
  const blob = new Blob([rows], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
function exportJSON(obj, filename) {
  downloadBlob(JSON.stringify(obj, null, 2), "application/json;charset=utf-8;", filename);
}
function downloadBlob(content, mime, filename) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
function openPrintable(html) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}
function copyToClipboard(text) {
  if (navigator?.clipboard?.writeText) return navigator.clipboard.writeText(text);
  return Promise.reject(new Error("Clipboard API unavailable"));
}

// ===========================================================================
// RECHARTS THEME HELPERS
// ===========================================================================
function tooltipStyle() { return { fontSize: 12, borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, color: C.text }; }
function axisTick() { return { fontSize: 11, fill: C.sub }; }

// ===========================================================================
// SHARED UI ATOMS
// ===========================================================================
function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Titillium+Web:wght@400;600;700;900&family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap');
      .f1-display { font-family: 'Titillium Web', sans-serif; }
      .f1-mono { font-family: 'IBM Plex Mono', monospace; }
      .fs-9 { font-size: 9px; } .fs-10 { font-size: 10px; } .fs-11 { font-size: 11px; }
      @keyframes purplePulse {
        0%,100% { box-shadow: 0 0 0 1px rgba(157,78,221,0.45), 0 0 18px 2px rgba(157,78,221,0.20); }
        50% { box-shadow: 0 0 0 1px rgba(157,78,221,0.8), 0 0 26px 5px rgba(157,78,221,0.35); }
      }
      @keyframes livedot { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
      @keyframes runbar { from { width: 0%; } to { width: 100%; } }
      .purple-pick { animation: purplePulse 2.6s ease-in-out infinite; }
      .live-dot { animation: livedot 1.4s ease-in-out infinite; }
      .run-bar { animation: runbar 900ms linear forwards; }
      .grid-row:hover { background: rgba(128,128,128,0.08); }
      .f1-row7 { display: grid; grid-template-columns: 28px 36px 1fr; }
      @media (min-width: 640px) {
        .f1-row7 { grid-template-columns: 36px 44px 1fr 120px 60px 70px 60px; }
      }
      .hero-grid { display: grid; grid-template-columns: 1fr; }
      .history-grid { display: grid; grid-template-columns: 1fr; }
      .control-grid { display: grid; grid-template-columns: 1fr; }
      .charts-grid { display: grid; grid-template-columns: 1fr; }
      .charts-grid-3 { display: grid; grid-template-columns: 1fr; }
      .constructor-row { display: grid; }
      .constructor-row-scoped { display: grid; }
      .driver-row { display: grid; }
      @media (min-width: 1024px) {
        .hero-grid { grid-template-columns: 1.3fr 1fr !important; }
        .history-grid { grid-template-columns: 220px 1fr 1fr !important; }
        .charts-grid { grid-template-columns: 2fr 1fr !important; }
        .charts-grid-3 { grid-template-columns: 1.2fr 1fr 1fr !important; }
      }
      @media (min-width: 640px) {
        .control-grid { grid-template-columns: 1.4fr 1fr 1fr 1fr auto !important; }
        .constructor-row { grid-template-columns: 36px 44px 1fr 100px 120px 90px !important; }
        .constructor-row-scoped { grid-template-columns: 36px 44px 1fr 100px !important; }
        .driver-row { grid-template-columns: 36px 44px 1fr 100px 90px !important; }
      }
      select.f1-select { appearance: none; -webkit-appearance: none; }
      @media (prefers-reduced-motion: reduce) {
        .purple-pick, .live-dot, .run-bar { animation: none !important; }
      }
    `}</style>
  );
}

function Select({ value, onChange, options, placeholder, disabled }) {
  return (
    <div className="relative">
      <select
        className="f1-select w-full text-sm rounded-lg pl-3 pr-8 py-2"
        value={value || ""}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        style={{ background: C.surface, color: value ? C.text : C.muted, border: `1px solid ${C.border}` }}
      >
        <option value="" disabled>{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute" style={{ right: 10, top: 10, color: C.muted }} />
    </div>
  );
}

function StatChip({ value, label }) {
  const empty = value === "—";
  return (
    <div className="rounded-lg pl-3 pr-3 py-2.5" style={{ background: C.surface, border: `1px solid ${C.border}`, borderLeftWidth: 3, borderLeftColor: C.red }}>
      <div className="f1-mono text-xl font-bold" style={{ color: empty ? C.muted : C.red }}>{value}</div>
      <div className="fs-10 uppercase tracking-widest mt-0.5 font-semibold" style={{ color: C.sub }}>{label}</div>
    </div>
  );
}

function Sparkline({ form }) {
  return (
    <span className="hidden sm:flex items-end h-5" style={{ gap: "2px" }}>
      {form.map((pos, fi) => (
        <span key={fi} className="w-1 rounded-sm" style={{
          height: `${Math.max(15, (21 - pos) * 5)}%`,
          background: pos <= 3 ? C.red : pos <= 10 ? C.green : "#D8DAE0",
        }} />
      ))}
    </span>
  );
}

function EmptyState({ icon: Icon, title, body }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-8 px-4">
      <Icon size={24} style={{ color: "#C7CAD1" }} />
      <div className="f1-display font-bold mt-3" style={{ color: C.text }}>{title}</div>
      <div className="text-xs mt-1" style={{ color: C.sub, maxWidth: 220, marginLeft: "auto", marginRight: "auto" }}>{body}</div>
    </div>
  );
}

// Dashed "drop your art here" containers — replace with <img> / background-image later.
function ImagePlaceholder({ label, minHeight = 160 }) {
  return (
    <div className="relative w-full rounded-xl flex items-center justify-center"
      style={{ minHeight, background: C.surfaceAlt, border: `2px dashed ${C.border}` }}>
      <div className="flex flex-col items-center gap-1 px-3 text-center">
        <ImageIcon size={20} style={{ color: C.muted }} />
        <span className="fs-10 uppercase tracking-widest font-semibold" style={{ color: C.muted }}>{label}</span>
      </div>
    </div>
  );
}
function ImgSlot({ size = 36, shape = "circle", label }) {
  return (
    <div title={label} className="flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size, borderRadius: shape === "circle" ? 9999 : 8, background: C.surfaceAlt, border: `1.5px dashed ${C.border}` }}>
      <ImageIcon size={Math.round(size * 0.42)} style={{ color: C.muted }} />
    </div>
  );
}

// A row of 1-3 dashed image slots. `flex`/`height` per slot let callers shape
// the row (e.g. podium-step heights) rather than always uniform boxes.
function ImageBannerRow({ slots, gap = 12 }) {
  return (
    <div className="flex items-end mb-5" style={{ gap }}>
      {slots.map((s, i) => (
        <div key={i} className="relative rounded-xl flex items-center justify-center overflow-hidden"
          style={{ flex: s.flex || 1, height: s.height || 130, background: C.surfaceAlt, border: `2px dashed ${C.border}` }}>
          {s.badge && (
            <span className="absolute top-2 left-2 fs-9 font-bold uppercase tracking-widest px-1.5 py-0.5 rounded text-white" style={{ background: C.red }}>{s.badge}</span>
          )}
          <div className="flex flex-col items-center gap-1 px-2 text-center">
            <ImageIcon size={s.height && s.height < 100 ? 16 : 20} style={{ color: C.muted }} />
            <span className="fs-9 uppercase tracking-widest font-semibold" style={{ color: C.muted }}>{s.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// Podium-shaped banner: P2 / P1 / P3, arranged in real podium step heights.
function PodiumImageBanner() {
  return (
    <ImageBannerRow slots={[
      { label: "P2 photo slot", badge: "P2", height: 100, flex: 1 },
      { label: "P1 photo slot", badge: "P1", height: 132, flex: 1.15 },
      { label: "P3 photo slot", badge: "P3", height: 78, flex: 0.9 },
    ]} />
  );
}

function TyreChip({ compound, size = 14 }) {
  const t = TYRES[compound] || TYRES.Medium;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="rounded-full flex-shrink-0" style={{ width: size, height: size, background: t.color, border: `2px solid ${t.outline || t.color}`, boxShadow: "inset 0 0 0 2px rgba(0,0,0,0.15)" }} />
      <span className="fs-11 font-semibold" style={{ color: C.text }}>{t.label}</span>
    </span>
  );
}

function Card({ title, icon: Icon, badge, children }) {
  return (
    <div className="rounded-xl p-3 shadow-sm" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: C.redTint }}>
            <Icon size={13} style={{ color: C.red }} />
          </span>
          <span className="f1-display font-bold text-sm" style={{ color: C.text }}>{title}</span>
        </div>
        {badge && <span className="fs-9 uppercase tracking-widest font-bold px-1.5 py-0.5 rounded" style={{ background: C.surfaceAlt, color: C.sub }}>{badge}</span>}
      </div>
      {children}
    </div>
  );
}
function Row({ k, v }) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ color: C.sub }}>{k}</span>
      <span className="f1-mono font-semibold" style={{ color: C.text }}>{v}</span>
    </div>
  );
}

// ===========================================================================
// NAV
// ===========================================================================
function NavBar({ tab, setTab, tick, theme, onToggleTheme, onGoHome }) {
  const items = [
    { id: "dashboard", label: "Dashboard" },
    { id: "standings", label: "Standings" },
    { id: "h2h", label: "H2H Comparison" },
    { id: "constructors", label: "Constructors" },
    { id: "analytics", label: "Analytics & Settings" },
    { id: "report", label: "Download Report" },
  ];
  return (
    <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-8 py-3 border-b"
      style={{ borderColor: C.border, background: C.surface }}>
      <button onClick={onGoHome} className="flex items-center gap-2.5" title="Back to home">
        <span className="w-8 h-8 rounded-lg flex items-center justify-center f1-display font-black text-white" style={{ background: C.red }}>F1</span>
        <span className="f1-display text-base font-bold" style={{ color: C.text }}>
          Predictor <span style={{ color: C.red }}>2026</span>
        </span>
      </button>

      <nav className="flex flex-wrap items-center gap-4">
        {items.map((it) => {
          const active = tab === it.id;
          return (
            <button key={it.id} onClick={() => setTab(it.id)}
              className="text-xs uppercase tracking-wide font-semibold pb-1"
              style={{ color: active ? C.red : C.sub, borderBottom: active ? `2px solid ${C.red}` : "2px solid transparent" }}>
              {it.label}
            </button>
          );
        })}
      </nav>

      <div className="flex items-center gap-2">
        <button onClick={onToggleTheme} title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, color: C.sub }}>
          {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        </button>
        <span className="fs-11" style={{ color: C.muted }}>Updated {tick}s ago</span>
        <span className="text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 text-white" style={{ background: C.red }}>
          <span className="live-dot w-1.5 h-1.5 rounded-full bg-white" />
          LIVE
        </span>
      </div>
    </header>
  );
}

// ===========================================================================
// DASHBOARD — HERO
// ===========================================================================
function Hero({ draft, setDraft, confidence, session, countdown }) {
  const race = CALENDAR.find((r) => r.id === draft.raceId);
  const rainDisplay = !race ? "—" :
    draft.weather === "wet" ? Math.max(70, race.baseRain) :
    draft.weather === "mixed" ? Math.round((race.baseRain + 40) / 2) :
    Math.round(race.baseRain * 0.4);
  const scDisplay = !race ? "—" : Math.min(90, race.baseSC + (draft.weather !== "dry" ? 10 : 0));
  const sessionTag = session === "practice" ? "Practice (Friday)" : session === "qualifying" ? "Qualifying (Saturday)" : "Race Day (Sunday)";

  return (
    <section className="px-4 sm:px-8 py-5">
      <div className="rounded-2xl p-6 shadow-sm" style={{ background: C.surfaceAlt, border: `1px solid ${C.border}` }}>
        <div className="hero-grid gap-6 items-start">
          <div>
            <div className="text-xs uppercase tracking-widest font-bold" style={{ color: C.red }}>
              2026 Formula 1 World Championship
            </div>
            <div className="flex items-baseline justify-between flex-wrap gap-2 mt-1">
              <h1 className="f1-display text-3xl font-black uppercase tracking-wide" style={{ color: C.text }}>
                Select a <span style={{ color: C.red }}>Grand Prix</span>
              </h1>
              <span className="text-xs font-bold uppercase tracking-wide" style={{ color: C.sub }}>{sessionTag}</span>
            </div>
            <p className="text-xs mt-1 mb-4 uppercase tracking-wide font-medium" style={{ color: C.sub }}>
              Choose a race below to start the prediction engine
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <Select
                value={draft.raceId}
                onChange={(v) => setDraft((s) => ({ ...s, raceId: v }))}
                placeholder="— Select Race —"
                options={CALENDAR.map((r) => ({ value: r.id, label: `${r.flag} Round ${r.round} · ${r.name}` }))}
              />
              <Select
                value={draft.weather}
                onChange={(v) => setDraft((s) => ({ ...s, weather: v }))}
                placeholder="Weather"
                options={[
                  { value: "dry", label: "☀️ Dry" },
                  { value: "mixed", label: "⛅ Mixed" },
                  { value: "wet", label: "🌧️ Wet" },
                ]}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatChip value={typeof scDisplay === "number" ? `${scDisplay}%` : "—"} label="Safety Car %" />
              <StatChip value={typeof rainDisplay === "number" ? `${rainDisplay}%` : "—"} label="Rain %" />
              <StatChip value={draft.simCount >= 1000 ? `${Math.round(draft.simCount / 1000)}k` : draft.simCount} label="Simulations" />
              <StatChip value={confidence ? `${confidence}%` : "—"} label="Confidence" />
            </div>
          </div>

          {/* IMAGE SLOT: hero banner (circuit / driver artwork) */}
          <div className="rounded-2xl overflow-hidden shadow-sm relative h-full" style={{ minHeight: 220, border: `2px dashed ${C.border}`, background: `linear-gradient(135deg, ${C.navy}, ${C.navyLight})` }}>
            <div className="absolute inset-0 opacity-90" style={{
              backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 18px, rgba(255,255,255,0.04) 18px, rgba(255,255,255,0.04) 36px)`,
            }} />
            <span className="absolute top-3 right-3 fs-9 uppercase tracking-widest font-bold px-2 py-1 rounded text-white z-10" style={{ background: "rgba(0,0,0,0.35)" }}>
              🖼 Hero image slot
            </span>
            <div className="relative p-5 flex flex-col justify-between h-full text-white">
              <div className="flex items-center gap-2">
                <span className="text-lg leading-none">🏁</span>
                <span className="fs-11 uppercase tracking-widest font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>Race weekend status</span>
              </div>
              <div className="rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="fs-9 uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.55)" }}>Next session in</div>
                <div className="f1-mono text-2xl font-bold tracking-wide">{formatCountdown(countdown)}</div>
              </div>
              <div>
                <div className="fs-10 uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.55)" }}>Selected event</div>
                <div className="f1-display text-xl font-bold">{race ? race.name : "No Grand Prix selected"}</div>
                <div className="fs-11 mt-1" style={{ color: "rgba(255,255,255,0.65)" }}>{race ? race.circuit : "Pick a race to populate this weekend's data"}</div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {["S1", "S2", "S3"].map((s, i) => (
                  <div key={s} className="rounded-lg p-2 text-center" style={{ background: i === 1 ? "rgba(157,78,221,0.22)" : "rgba(255,255,255,0.06)" }}>
                    <div className="fs-9 uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.6)" }}>{s}</div>
                    <div className="f1-mono text-sm font-semibold" style={{ color: i === 1 ? "#D9B3F7" : "#fff" }}>{(0.2 + i * 0.11).toFixed(3)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ===========================================================================
// CIRCUIT HISTORY — appears as soon as a race is picked (independent of Run)
// ===========================================================================
function ManualGridEntry({ currentGrid, onApply, onCancel }) {
  const [rows, setRows] = useState(() => {
    const byPos = {};
    if (currentGrid) Object.entries(currentGrid).forEach(([code, pos]) => { byPos[pos] = code; });
    return Array.from({ length: 22 }, (_, i) => ({ position: i + 1, code: byPos[i + 1] || FLAT_DRIVERS[i]?.code || "" }));
  });

  function updateRow(pos, code) {
    setRows((rs) => rs.map((r) => (r.position === pos ? { ...r, code } : r)));
  }
  function apply() {
    const grid = {};
    rows.forEach((r) => { if (r.code) grid[r.code] = r.position; });
    onApply(grid);
  }
  const usedCodes = new Set(rows.map((r) => r.code).filter(Boolean));
  const duplicates = rows.length !== usedCodes.size;

  return (
    <div className="rounded-xl p-4 shadow-sm mt-3" style={{ background: C.surfaceAlt, border: `1px solid ${C.border}` }}>
      <div className="f1-display font-bold mb-1" style={{ color: C.text }}>Manual Grid Entry</div>
      <p className="text-xs mb-3" style={{ color: C.sub }}>Place each driver in their P1-P22 starting position — this overrides the auto-filled qualifying grid for this prediction.</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3" style={{ maxHeight: 320, overflowY: "auto" }}>
        {rows.map((r) => (
          <div key={r.position} className="flex items-center gap-1.5">
            <span className="f1-mono fs-11 font-bold flex-shrink-0" style={{ color: C.sub, width: 28 }}>P{r.position}</span>
            <Select value={r.code} onChange={(v) => updateRow(r.position, v)} placeholder="—"
              options={FLAT_DRIVERS.map((d) => ({ value: d.code, label: `${d.code} · ${d.teamName}` }))} />
          </div>
        ))}
      </div>
      {duplicates && <div className="fs-11 mb-2" style={{ color: C.amber }}>Heads up — the same driver is used in more than one position.</div>}
      <div className="flex gap-2">
        <button onClick={apply} className="text-xs font-bold uppercase tracking-wide px-4 py-2 rounded text-white" style={{ background: C.red }}>Apply Grid</button>
        <button onClick={onCancel} className="text-xs font-bold uppercase tracking-wide px-4 py-2 rounded" style={{ border: `1px solid ${C.border}`, color: C.sub }}>Cancel</button>
      </div>
    </div>
  );
}

function ManualGridEditor({ value, onApply, onCancel, seedGrid }) {
  const [draftGrid, setDraftGrid] = useState(() => {
    const init = {};
    const seeded = seedGrid ? Object.entries(seedGrid).sort((a, b) => a[1] - b[1]).map(([code]) => code) : [];
    for (let pos = 1; pos <= 22; pos++) init[pos] = seeded[pos - 1] || FLAT_DRIVERS[pos - 1]?.code || "";
    return value ? Object.fromEntries(Array.from({ length: 22 }, (_, i) => [i + 1, Object.entries(value).find(([, p]) => p === i + 1)?.[0] || init[i + 1]])) : init;
  });

  const counts = {};
  Object.values(draftGrid).forEach((c) => { if (c) counts[c] = (counts[c] || 0) + 1; });
  const duplicates = Object.entries(counts).filter(([, n]) => n > 1).map(([c]) => c);

  function setPos(pos, code) { setDraftGrid((g) => ({ ...g, [pos]: code })); }
  function apply() {
    const grid = {};
    Object.entries(draftGrid).forEach(([pos, code]) => { if (code) grid[code] = Number(pos); });
    onApply(grid);
  }

  return (
    <div className="rounded-xl p-4 shadow-sm mb-4" style={{ background: C.surface, border: `1px solid ${C.red}` }}>
      <div className="flex items-center justify-between mb-2">
        <div className="f1-display font-bold" style={{ color: C.text }}>Manual Grid Entry — P1 to P22</div>
        <button onClick={onCancel} className="fs-11 font-semibold" style={{ color: C.sub }}>Cancel</button>
      </div>
      <p className="text-xs mb-3" style={{ color: C.sub }}>Assign a driver to each starting position. This overrides both live and simulated qualifying for the race prediction.</p>
      {duplicates.length > 0 && (
        <div className="fs-11 font-semibold mb-3 px-3 py-2 rounded-lg" style={{ background: C.redTint, color: C.red }}>
          <AlertTriangle size={12} className="inline mr-1" /> Duplicate driver(s) assigned: {duplicates.join(", ")} — each driver should occupy one grid slot.
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-4" style={{ maxHeight: 340, overflowY: "auto" }}>
        {Array.from({ length: 22 }, (_, i) => i + 1).map((pos) => (
          <div key={pos} className="flex items-center gap-1.5">
            <span className="f1-mono fs-11 font-bold flex-shrink-0" style={{ color: C.sub, width: 24 }}>P{pos}</span>
            <Select value={draftGrid[pos]} onChange={(v) => setPos(pos, v)} placeholder="—"
              options={FLAT_DRIVERS.map((d) => ({ value: d.code, label: d.code }))} />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={apply} className="text-xs font-bold uppercase tracking-wide px-4 py-2.5 rounded text-white" style={{ background: C.red }}>Apply Manual Grid</button>
        <button onClick={onCancel} className="text-xs font-bold uppercase tracking-wide px-4 py-2.5 rounded" style={{ border: `1px solid ${C.border}`, color: C.text }}>Cancel</button>
      </div>
    </div>
  );
}

function RealResultBanner({ race }) {
  const result = useRaceResult(race?.status === "completed" ? race.round : null);
  if (!race || race.status !== "completed") return null;
  return (
    <section className="px-4 sm:px-8 pb-2">
      <div className="rounded-xl p-4 shadow-sm flex items-start gap-3" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
        <span className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: C.redTint }}>
          <Flag size={15} style={{ color: C.red }} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="f1-display font-bold" style={{ color: C.text }}>This race already happened — {race.date}</div>
          {result.status === "loading" && <p className="text-xs mt-1" style={{ color: C.sub }}>Fetching the real result from Jolpica…</p>}
          {result.status === "success" && (
            <div className="mt-1">
              <p className="text-xs" style={{ color: C.sub }}>
                Real winner: <b style={{ color: C.text }}>{result.results[0].name}</b> ({result.results[0].teamName})
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {result.results.slice(0, 3).map((r) => (
                  <span key={r.code} className="fs-11 f1-mono font-semibold px-2 py-1 rounded" style={{ background: C.surfaceAlt, color: C.text }}>P{r.position} {r.code}</span>
                ))}
              </div>
            </div>
          )}
          {result.status === "error" && (
            <p className="text-xs mt-1" style={{ color: C.amber }}>Live result unavailable right now (or Force Simulated Mode is on in Settings).</p>
          )}
          <p className="fs-10 mt-2" style={{ color: C.muted }}>You can still run the prediction engine below to see what the model would have projected, for comparison.</p>
        </div>
      </div>
    </section>
  );
}

function CircuitHistorySection({ race }) {
  if (!race) return null;
  const history = useMemo(() => circuitHistory(race.id), [race.id]);
  const chartData = history.map((h) => ({ year: String(h.year), safetyCars: h.safetyCars, overtakes: h.overtakes }));

  return (
    <section className="px-4 sm:px-8 pb-2">
      <div className="rounded-xl p-4 shadow-sm" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: C.redTint }}>
            <History size={14} style={{ color: C.red }} />
          </span>
          <span className="f1-display font-bold" style={{ color: C.text }}>Circuit History · {race.name}</span>
        </div>
        <p className="text-xs mb-3" style={{ color: C.sub }}>
          Simulated last 3 editions — an illustrative backtest of the <b>current 2026 grid</b> at this circuit, not a record of real past results.
        </p>

        <div className="history-grid gap-4">
          <ImagePlaceholder label="Circuit map image slot" minHeight={140} />

          <div className="space-y-2">
            {history.map((h) => (
              <div key={h.year} className="flex items-center gap-3 text-sm rounded-lg px-3 py-2" style={{ background: C.surfaceAlt }}>
                <span className="f1-mono font-bold" style={{ color: C.text, width: 40 }}>{h.year}</span>
                <span className="w-2 h-6 rounded-sm" style={{ background: h.winner.color }} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate" style={{ color: C.text }}>{h.winner.name}</div>
                  <div className="fs-10" style={{ color: C.sub }}>P2 {h.second.code} · P3 {h.third.code}</div>
                </div>
                <span className="fs-10 font-semibold" style={{ color: C.sub }}>{h.safetyCars} SC</span>
              </div>
            ))}
          </div>

          <div>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={chartData} margin={{ top: 5, right: 25, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.gridline} />
                <XAxis dataKey="year" tick={axisTick()} />
                <YAxis yAxisId="left" allowDecimals={false} tick={axisTick()} />
                <YAxis yAxisId="right" orientation="right" allowDecimals={false} tick={axisTick()} />
                <Tooltip contentStyle={tooltipStyle()} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="left" dataKey="safetyCars" name="Safety cars" fill={C.red} radius={[6, 6, 0, 0]} barSize={26} />
                <Line yAxisId="right" type="monotone" dataKey="overtakes" name="Overtakes" stroke={C.purple} strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}

function SessionCards({ session, setSession, setSubSession, race }) {
  return (
    <section className="px-4 sm:px-8 pt-3">
      <div className="fs-11 uppercase tracking-widest font-bold mb-1.5" style={{ color: C.sub }}>
        Select race weekend session {race?.sprint && <span className="fs-10 px-1.5 py-0.5 rounded font-bold" style={{ background: C.redTint, color: C.red }}>SPRINT WEEKEND</span>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {SESSIONS.map((s) => {
          const active = session === s.id;
          return (
            <button key={s.id} onClick={() => { setSession(s.id); setSubSession(getSubSessions(s.id, race)[0]); }}
              className="text-left rounded-xl p-3 shadow-sm transition-colors"
              style={{ background: active ? C.red : C.surface, border: `1px solid ${active ? C.red : C.border}` }}>
              <span className="text-xl leading-none">{s.icon}</span>
              <div className="f1-display font-bold text-sm mt-1.5" style={{ color: active ? "#fff" : C.text }}>{s.label}</div>
              <div className="fs-11 mt-0.5" style={{ color: active ? "rgba(255,255,255,0.85)" : C.sub }}>{sessionDesc(s.id, race)}</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ControlBar({ draft, setDraft, session, subSession, setSubSession, onRun, running, raceSelected, race }) {
  const subOptions = getSubSessions(session, race);
  return (
    <section className="px-4 sm:px-8 py-4">
      <div className="control-grid rounded-xl p-4 shadow-sm gap-3 items-end" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
        <div>
          <div className="fs-10 uppercase tracking-widest font-semibold mb-1" style={{ color: C.sub }}>Grand Prix</div>
          <Select value={draft.raceId} onChange={(v) => setDraft((s) => ({ ...s, raceId: v }))} placeholder="— Select Race —"
            options={CALENDAR.map((r) => ({ value: r.id, label: r.name }))} />
        </div>
        <div>
          <div className="fs-10 uppercase tracking-widest font-semibold mb-1" style={{ color: C.sub }}>Weather</div>
          <Select value={draft.weather} onChange={(v) => setDraft((s) => ({ ...s, weather: v }))} placeholder="Weather"
            options={[{ value: "dry", label: "☀️ Dry" }, { value: "mixed", label: "⛅ Mixed" }, { value: "wet", label: "🌧️ Wet" }]} />
        </div>
        <div>
          <div className="fs-10 uppercase tracking-widest font-semibold mb-1" style={{ color: C.sub }}>Simulations</div>
          <input type="number" min={100} max={100000} step={100} value={draft.simCount}
            onChange={(e) => setDraft((s) => ({ ...s, simCount: Math.max(100, Math.min(100000, Number(e.target.value) || 0)) }))}
            className="w-full text-sm rounded-lg px-3 py-2 f1-mono"
            style={{ background: C.surface, color: C.text, border: `1px solid ${C.border}` }} />
        </div>
        <div>
          <div className="fs-10 uppercase tracking-widest font-semibold mb-1" style={{ color: C.sub }}>Session Type</div>
          <Select value={subSession} onChange={setSubSession} placeholder="Session"
            options={subOptions.map((s) => ({ value: s, label: s }))} />
        </div>
        <button onClick={onRun} disabled={!raceSelected || running}
          className="text-sm font-bold uppercase tracking-wide px-5 py-2.5 rounded-lg flex items-center justify-center gap-2 whitespace-nowrap text-white"
          style={{ background: raceSelected ? C.red : "#D8DAE0", cursor: raceSelected && !running ? "pointer" : "not-allowed" }}>
          {running ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
          {running ? "Running…" : "Run Prediction"}
        </button>
      </div>
      {running && (
        <div className="h-1 rounded-full overflow-hidden mt-2" style={{ background: C.border }}>
          <div className="run-bar h-full" style={{ background: C.red }} />
        </div>
      )}
      {!raceSelected && <div className="fs-11 mt-2" style={{ color: C.muted }}>Select a Grand Prix above to enable the prediction engine.</div>}
    </section>
  );
}

function InfoCards({ race, session, subSession, weather, runState }) {
  const done = runState === "done";
  const sessionMetricLabel = session === "practice" ? "Tyre degradation forecast" : session === "qualifying" ? "Pole time gap forecast" : "Safety car probability";
  const sessionMetricValue = !race ? null :
    session === "practice" ? (race.baseSC > 30 ? "High" : "Medium") :
    session === "qualifying" ? `${(0.15 + (race.overtaking === "Low" ? 0.25 : 0.1)).toFixed(2)}s` :
    `${Math.min(90, race.baseSC + (weather !== "dry" ? 10 : 0))}%`;

  return (
    <section className="px-4 sm:px-8 pb-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <Card title="Circuit Info" icon={MapPin}>
          {!race ? <EmptyState icon={MapPin} title="Select a Grand Prix" body="Circuit details will appear after you run a prediction." /> : (
            <div className="space-y-2 text-sm">
              <Row k="Circuit" v={race.circuit} />
              <Row k="Laps" v={race.laps} />
              <Row k="Length" v={`${race.lengthKm.toFixed(3)} km`} />
              <Row k="DRS zones" v={race.drs} />
              <Row k="Overtaking" v={race.overtaking} />
            </div>
          )}
        </Card>

        <Card title="Session Forecast" icon={Timer} badge={subSession}>
          {!race || !done ? <EmptyState icon={Timer} title="No data yet" body="Run the prediction engine to see results." /> : (
            <div>
              <div className="fs-11 uppercase tracking-widest font-semibold" style={{ color: C.sub }}>{sessionMetricLabel}</div>
              <div className="f1-mono text-3xl font-bold mt-1" style={{ color: C.red }}>{sessionMetricValue}</div>
              <div className="text-xs mt-2" style={{ color: C.sub }}>
                {session === "practice" && "Long-run pace suggests degradation will shape strategy more than raw pace."}
                {session === "qualifying" && "Gap estimate between provisional pole and the Q3 cut-off line."}
                {session === "race" && "Modelled probability of at least one safety car or VSC period."}
              </div>
            </div>
          )}
        </Card>

        <Card title="Track Conditions" icon={Thermometer}>
          {!race ? <EmptyState icon={CloudSun} title="No data yet" body="Track conditions populate once a race is selected." /> : (
            <div>
              <div className="rounded-lg p-4 flex items-center justify-between text-white" style={{ background: C.navy }}>
                <div className="flex items-center gap-3">
                  {weather === "wet" ? <CloudRain size={26} /> : weather === "mixed" ? <CloudSun size={26} /> : <Sun size={26} />}
                  <div>
                    <div className="f1-mono text-2xl font-bold">{race.baseTemp}°C</div>
                    <div className="fs-11" style={{ color: "rgba(255,255,255,0.75)" }}>{weather === "wet" ? "Wet & Rainy" : weather === "mixed" ? "Mixed Conditions" : "Sunny & Clear"}</div>
                  </div>
                </div>
                <div className="text-right fs-11" style={{ color: "rgba(255,255,255,0.75)" }}>
                  <div className="flex items-center gap-1 justify-end"><Droplets size={11} />{weather === "wet" ? 85 : weather === "mixed" ? 60 : 40}% humidity</div>
                  <div className="flex items-center gap-1 justify-end mt-1"><Wind size={11} />{8 + (race.round % 7)} km/h</div>
                  <div className="mt-1">{race.baseTemp + 8}°C track</div>
                </div>
              </div>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span style={{ color: C.sub }}>Compound call</span>
                  <TyreChip compound={compoundForWeather(weather)} />
                </div>
                <Row k="Grip level" v={weather === "dry" ? "High" : "Reduced"} />
              </div>
            </div>
          )}
        </Card>
      </div>
    </section>
  );
}

// ===========================================================================
// RESULTS — PODIUM/PACE HERO + CHARTS + GRID TABLE
// ===========================================================================
function ResultsHero({ session, target, field, pace }) {
  if (session === "practice") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {pace.slice(0, 3).map((d, idx) => <PraceCard key={d.code} d={d} idx={idx} />)}
      </div>
    );
  }
  const heroLabel = session === "qualifying" ? "Projected front row" : target.label;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
      {field.slice(0, 3).map((d, idx) => <PodiumCard key={d.code} d={d} idx={idx} label={heroLabel} />)}
    </div>
  );
}

function PraceCard({ d, idx }) {
  const purple = idx === 0;
  return (
    <div className={`relative rounded-xl p-3 overflow-hidden shadow-sm ${purple ? "purple-pick" : ""}`}
      style={{ background: C.surface, border: `1px solid ${purple ? C.purple : C.border}` }}>
      <div className="absolute left-0 top-0 bottom-0" style={{ width: 4, background: d.color }} />
      {purple && <span className="f1-mono absolute top-3 right-3 fs-9 uppercase tracking-widest font-bold px-1.5 py-0.5 rounded" style={{ color: C.purple, background: C.purpleTint }}>Purple Pick</span>}
      <div className="pl-2">
        <div className="flex items-center gap-2 mb-1.5">
          <ImgSlot size={32} label="Driver headshot slot" />
          <div>
            <div className="f1-mono fs-11 uppercase tracking-widest font-semibold" style={{ color: C.sub }}>{ordinal(idx + 1)} · fastest</div>
            <div className="f1-display text-base font-bold" style={{ color: C.text }}>{d.name}</div>
          </div>
        </div>
        <div className="fs-11 mb-1.5" style={{ color: C.sub }}>{d.teamName} · #{d.number}</div>
        <div className="f1-mono text-2xl font-bold" style={{ color: purple ? C.purple : C.text }}>
          {idx === 0 ? "LEAD" : `+${d.gap.toFixed(3)}s`}
        </div>
        <div className="fs-11 mt-1" style={{ color: C.sub }}>Tyre deg: <span style={{ color: riskColor(d.tyreDeg) }}>{d.tyreDeg}</span></div>
      </div>
    </div>
  );
}

function PodiumCard({ d, idx, label }) {
  const purple = idx === 0;
  return (
    <div className={`relative rounded-xl p-3 overflow-hidden shadow-sm ${purple ? "purple-pick" : ""}`}
      style={{ background: C.surface, border: `1px solid ${purple ? C.purple : C.border}` }}>
      <div className="absolute left-0 top-0 bottom-0" style={{ width: 4, background: d.color }} />
      {purple && <span className="f1-mono absolute top-3 right-3 fs-9 uppercase tracking-widest font-bold px-1.5 py-0.5 rounded" style={{ color: C.purple, background: C.purpleTint }}>Purple Pick</span>}
      <div className="pl-2">
        <div className="flex items-center gap-2 mb-1.5">
          <ImgSlot size={32} label="Driver headshot slot" />
          <div>
            <div className="f1-mono fs-11 uppercase tracking-widest font-semibold" style={{ color: C.sub }}>{ordinal(idx + 1)} · projected</div>
            <div className="f1-display text-base font-bold" style={{ color: C.text }}>{d.name}</div>
          </div>
        </div>
        <div className="fs-11 mb-1.5" style={{ color: C.sub }}>{d.teamName} · #{d.number}</div>
        <div className="f1-mono text-2xl font-bold" style={{ color: purple ? C.purple : C.text }}>
          {(d.prob * 100).toFixed(1)}<span className="text-base" style={{ color: C.sub }}>%</span>
        </div>
        <div className="fs-11 mt-1" style={{ color: C.sub }}>{label} probability</div>
      </div>
    </div>
  );
}

function DistributionChart({ session, target, field, pace }) {
  const rows = (session === "practice" ? pace : field).slice(0, 12);
  const maxGap = Math.max(...rows.map((d) => d.gap || 0), 0.001);
  const data = rows.map((d) => ({
    code: d.code,
    value: session === "practice" ? Number((maxGap - d.gap + 0.05).toFixed(3)) : Number((d.prob * 100).toFixed(1)),
    color: d.color,
    label: session === "practice" ? (d.gap === 0 ? "LEAD" : `+${d.gap.toFixed(3)}s`) : `${(d.prob * 100).toFixed(1)}%`,
  }));
  return (
    <ResponsiveContainer width="100%" height={340}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 6, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.gridline} horizontal={false} />
        <XAxis type="number" tick={axisTick()}
          label={{ value: session === "practice" ? "Relative pace (higher = faster)" : `${target.label} probability (%)`, position: "insideBottom", offset: -5, fontSize: 11, fill: C.sub }} />
        <YAxis type="category" dataKey="code" width={44} tick={{ fontSize: 11, fill: C.text, fontWeight: 600 }} />
        <Tooltip contentStyle={tooltipStyle()} formatter={(_, __, p) => [p.payload.label, "Value"]} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]}>
          {data.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function ConfidenceGauge({ confidence }) {
  const value = confidence || 0;
  const data = [{ name: "confidence", value, fill: C.red }];
  return (
    <div className="relative" style={{ height: 240 }}>
      <ResponsiveContainer width="100%" height={240}>
        <RadialBarChart innerRadius="72%" outerRadius="100%" data={data} startAngle={90} endAngle={-270} barSize={18}>
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar background={{ fill: C.surfaceAlt }} dataKey="value" cornerRadius={9} fill={C.red} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="f1-mono text-3xl font-bold" style={{ color: value ? C.text : C.muted }}>{value ? `${value}%` : "—"}</span>
        <span className="fs-10 uppercase tracking-widest font-semibold" style={{ color: C.sub }}>Confidence</span>
      </div>
    </div>
  );
}

function DnfRiskPie({ field }) {
  const counts = { Low: 0, Medium: 0, High: 0 };
  field.forEach((d) => { counts[d.dnfRisk] = (counts[d.dnfRisk] || 0) + 1; });
  const data = [
    { name: "Low risk", value: counts.Low, color: C.green },
    { name: "Medium risk", value: counts.Medium, color: C.amber },
    { name: "High risk", value: counts.High, color: C.red },
  ].filter((d) => d.value > 0);
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={3} label={(e) => `${e.value}`}>
          {data.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Pie>
        <Tooltip contentStyle={tooltipStyle()} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function PaceEvolutionChart({ raceId, weather }) {
  const subs = ["FP1", "FP2", "FP3"];
  const paceBySub = subs.map((s) => computePace(raceId, weather, s));
  const top5 = paceBySub[2].slice(0, 5);
  const data = subs.map((s, i) => {
    const row = { session: s };
    top5.forEach((d) => {
      const match = paceBySub[i].find((x) => x.code === d.code);
      row[d.code] = Number((5 - match.gap).toFixed(2));
    });
    return row;
  });
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.gridline} />
        <XAxis dataKey="session" tick={axisTick()} />
        <YAxis tick={axisTick()} />
        <Tooltip contentStyle={tooltipStyle()} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {top5.map((d) => (
          <Line key={d.code} type="monotone" dataKey={d.code} name={d.code} stroke={d.color} strokeWidth={2} dot={{ r: 3 }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function StrategySection({ race, weather, field, strategyAggressiveness = 50 }) {
  if (!race) return null;
  const top5 = field.slice(0, 5);
  return (
    <div className="rounded-xl p-4 shadow-sm mt-4" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
      <div className="f1-display font-bold mb-1" style={{ color: C.text }}>Predicted Pit Strategy</div>
      <p className="text-xs mb-3" style={{ color: C.sub }}>Modelled stint plan across {race.laps} laps for the top 5 projected finishers.</p>
      <div className="space-y-3">
        {top5.map((d) => {
          const stints = predictedStrategy(d, race, weather, race.id, strategyAggressiveness);
          return (
            <div key={d.code} className="flex items-center gap-3">
              <span className="f1-mono fs-11 font-bold" style={{ color: C.text, width: 40 }}>{d.code}</span>
              <div className="flex-1 flex h-5 rounded-md overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
                {stints.map((s, i) => (
                  <div key={i} title={`${s.compound} · ${s.laps} laps`} className="flex items-center justify-center fs-9 font-bold"
                    style={{ width: `${(s.laps / race.laps) * 100}%`, background: TYRES[s.compound].color, color: s.compound === "Hard" || s.compound === "Medium" ? "#15151E" : "#fff" }}>
                    {s.laps}L
                  </div>
                ))}
              </div>
              <span className="fs-10 flex-shrink-0" style={{ color: C.sub, width: 44 }}>{stints.length - 1}-stop</span>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t" style={{ borderColor: C.border }}>
        {Object.keys(TYRES).map((k) => <TyreChip key={k} compound={k} size={11} />)}
      </div>
    </div>
  );
}

// --- FRIDAY / PRACTICE ------------------------------------------------------
function SectorComparisonChart({ pace }) {
  const top6 = pace.slice(0, 6);
  const data = top6.map((d) => {
    const total = 78 + d.gap;
    const s1 = total * (0.29 + (seededRandom(d.code + "s1t") - 0.5) * 0.02);
    const s2 = total * (0.33 + (seededRandom(d.code + "s2t") - 0.5) * 0.02);
    const s3 = Math.max(1, total - s1 - s2);
    return { code: d.code, S1: Number(s1.toFixed(2)), S2: Number(s2.toFixed(2)), S3: Number(s3.toFixed(2)) };
  });
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.gridline} />
        <XAxis dataKey="code" tick={axisTick()} />
        <YAxis tick={axisTick()} label={{ value: "Seconds", angle: -90, position: "insideLeft", fontSize: 10, fill: C.sub }} />
        <Tooltip contentStyle={tooltipStyle()} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="S1" stackId="a" name="Sector 1" fill={C.purple} />
        <Bar dataKey="S2" stackId="a" name="Sector 2" fill={C.red} />
        <Bar dataKey="S3" stackId="a" name="Sector 3" fill={C.green} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function ConsistencyChart({ pace }) {
  const top8 = pace.slice(0, 8);
  const data = top8.map((d) => ({
    code: d.code,
    stdDev: Number((0.08 + ((100 - d.reliability) / 100) * 0.35 + seededRandom(d.code + "cons") * 0.15).toFixed(3)),
    color: d.color,
  }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.gridline} />
        <XAxis dataKey="code" tick={axisTick()} />
        <YAxis tick={axisTick()} label={{ value: "Lap-time spread (σ, s)", angle: -90, position: "insideLeft", fontSize: 10, fill: C.sub }} />
        <Tooltip contentStyle={tooltipStyle()} />
        <Bar dataKey="stdDev" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function TyreCompoundUsageChart({ pace }) {
  const top6 = pace.slice(0, 6);
  const data = top6.map((d) => {
    const seed = d.code + "tyreuse";
    const soft = Math.round(6 + seededRandom(seed + "s") * 8);
    const medium = Math.round(8 + seededRandom(seed + "m") * 10);
    const hard = Math.round(20 - soft * 0.3 + seededRandom(seed + "h") * 8);
    return { code: d.code, Soft: soft, Medium: medium, Hard: Math.max(2, hard) };
  });
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.gridline} />
        <XAxis dataKey="code" tick={axisTick()} />
        <YAxis tick={axisTick()} label={{ value: "Laps run", angle: -90, position: "insideLeft", fontSize: 10, fill: C.sub }} />
        <Tooltip contentStyle={tooltipStyle()} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="Soft" stackId="a" name="Soft" fill={TYRES.Soft.color} />
        <Bar dataKey="Medium" stackId="a" name="Medium" fill={TYRES.Medium.color} />
        <Bar dataKey="Hard" stackId="a" name="Hard" fill={TYRES.Hard.color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function LongRunDegradationChart({ pace }) {
  const top5 = pace.slice(0, 5);
  const laps = [1, 5, 10, 15, 20];
  const data = laps.map((lap) => {
    const row = { lap: `L${lap}` };
    top5.forEach((d) => {
      const degRate = 0.02 + ((100 - d.reliability) / 100) * 0.05 + seededRandom(d.code + "degrate") * 0.02;
      row[d.code] = Number((d.gap * 0.3 + lap * degRate).toFixed(2));
    });
    return row;
  });
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.gridline} />
        <XAxis dataKey="lap" tick={axisTick()} />
        <YAxis tick={axisTick()} label={{ value: "Cumulative deg. (s)", angle: -90, position: "insideLeft", fontSize: 10, fill: C.sub }} />
        <Tooltip contentStyle={tooltipStyle()} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {top5.map((d) => <Line key={d.code} type="monotone" dataKey={d.code} name={d.code} stroke={d.color} strokeWidth={2} dot={{ r: 2 }} />)}
      </LineChart>
    </ResponsiveContainer>
  );
}

// --- SATURDAY / QUALIFYING ---------------------------------------------------
function GapToPoleChart({ field }) {
  const rows = field.slice(0, 12);
  const maxProb = rows[0]?.prob || 1;
  const data = rows.map((d) => ({ code: d.code, gap: Number((((maxProb - d.prob) / maxProb) * 1.6).toFixed(3)), color: d.color }));
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 6, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.gridline} horizontal={false} />
        <XAxis type="number" tick={axisTick()} label={{ value: "Gap to pole (s)", position: "insideBottom", offset: -5, fontSize: 10, fill: C.sub }} />
        <YAxis type="category" dataKey="code" width={44} tick={{ fontSize: 11, fill: C.text, fontWeight: 600 }} />
        <Tooltip contentStyle={tooltipStyle()} />
        <Bar dataKey="gap" radius={[0, 6, 6, 0]}>
          {data.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function QualifyingFunnel({ field, subSession }) {
  const stages = [
    { id: "Q1", cut: 15, label: "Q1 · 20 → 15" },
    { id: "Q2", cut: 10, label: "Q2 · 15 → 10" },
    { id: "Q3", cut: 10, label: "Q3 · Top 10" },
  ];
  return (
    <div className="space-y-2">
      {stages.map((s) => {
        const active = s.id === subSession;
        const advancing = field.slice(0, s.cut);
        return (
          <div key={s.id} className="rounded-lg p-3" style={{ background: active ? C.redTint : C.surfaceAlt, border: `1px solid ${active ? C.red : C.border}` }}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="f1-mono fs-11 font-bold uppercase tracking-widest" style={{ color: active ? C.red : C.sub }}>{s.label}</span>
              {active && <span className="fs-9 uppercase tracking-widest font-bold px-1.5 py-0.5 rounded text-white" style={{ background: C.red }}>Current</span>}
            </div>
            <div className="flex flex-wrap gap-1">
              {advancing.map((d) => (
                <span key={d.code} className="fs-9 f1-mono font-semibold px-1.5 py-0.5 rounded" style={{ background: d.color, color: "#fff" }}>{d.code}</span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TrackEvolutionChart({ field }) {
  const subs = ["Q1", "Q2", "Q3"];
  const top5 = field.slice(0, 5);
  const data = subs.map((s, i) => {
    const row = { session: s };
    top5.forEach((d) => {
      const improvement = i * (0.15 + seededRandom(d.code + "eq" + i) * 0.1);
      row[d.code] = Number((78 + d.prob * -2 - improvement).toFixed(2));
    });
    return row;
  });
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.gridline} />
        <XAxis dataKey="session" tick={axisTick()} />
        <YAxis tick={axisTick()} domain={["dataMin - 0.3", "dataMax + 0.3"]} label={{ value: "Best lap (s)", angle: -90, position: "insideLeft", fontSize: 10, fill: C.sub }} />
        <Tooltip contentStyle={tooltipStyle()} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {top5.map((d) => <Line key={d.code} type="monotone" dataKey={d.code} name={d.code} stroke={d.color} strokeWidth={2} dot={{ r: 3 }} />)}
      </LineChart>
    </ResponsiveContainer>
  );
}

function GridPenaltyImpactChart({ field }) {
  const rows = field.slice(0, 10).map((d, i) => {
    const hasPenalty = seededRandom(d.code + "penalty") > 0.78;
    const penalty = hasPenalty ? Math.round(3 + seededRandom(d.code + "penaltysize") * 7) : 0;
    return { code: d.code, Qualified: i + 1, "Grid (after penalty)": i + 1 + penalty, color: d.color };
  });
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={rows} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.gridline} />
        <XAxis dataKey="code" tick={axisTick()} />
        <YAxis reversed tick={axisTick()} label={{ value: "Position", angle: -90, position: "insideLeft", fontSize: 10, fill: C.sub }} />
        <Tooltip contentStyle={tooltipStyle()} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="Qualified" fill={C.muted} radius={[4, 4, 0, 0]} />
        <Bar dataKey="Grid (after penalty)" fill={C.red} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// --- SUNDAY / RACE -----------------------------------------------------------
function PositionChangeChart({ field }) {
  const data = field.slice(0, 12).map((d, i) => {
    const grid = d.grid || (i + 1 + Math.round((seededRandom(d.code + "gridpos") - 0.5) * 5));
    return { code: d.code, delta: grid - (i + 1) };
  });
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.gridline} />
        <XAxis dataKey="code" tick={axisTick()} />
        <YAxis tick={axisTick()} label={{ value: "Places gained (grid→finish)", angle: -90, position: "insideLeft", fontSize: 10, fill: C.sub }} />
        <Tooltip contentStyle={tooltipStyle()} />
        <Bar dataKey="delta" radius={[4, 4, 4, 4]}>
          {data.map((d, i) => <Cell key={i} fill={d.delta >= 0 ? C.green : C.red} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function LapPaceTrendChart({ field, race }) {
  const top5 = field.slice(0, 5);
  const laps = race?.laps || 55;
  const checkpoints = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * laps));
  const data = checkpoints.map((lap, idx) => {
    const row = { lap: `L${lap}` };
    top5.forEach((d) => {
      const base = (1 - d.prob) * 30;
      const noise = (seededRandom(d.code + "trend" + idx) - 0.5) * 4;
      row[d.code] = Number(Math.max(0, base + noise + idx * 1.2).toFixed(1));
    });
    return row;
  });
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.gridline} />
        <XAxis dataKey="lap" tick={axisTick()} />
        <YAxis tick={axisTick()} label={{ value: "Gap to leader (s)", angle: -90, position: "insideLeft", fontSize: 10, fill: C.sub }} />
        <Tooltip contentStyle={tooltipStyle()} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {top5.map((d) => <Line key={d.code} type="monotone" dataKey={d.code} name={d.code} stroke={d.color} strokeWidth={2} dot={{ r: 2 }} />)}
      </LineChart>
    </ResponsiveContainer>
  );
}

function SafetyCarWindowChart({ race, field }) {
  const laps = race?.laps || 55;
  const baseSC = race?.baseSC || 30;
  const windows = ["Laps 1-25%", "25-50%", "50-75%", "75-100%"];
  const data = windows.map((w, i) => {
    // Safety cars cluster slightly early (start incidents) and late (strategy scrambles)
    const shape = [1.3, 0.7, 0.8, 1.2][i];
    return { window: w, chance: Number(Math.min(45, (baseSC / 4) * shape + seededRandom(race?.id + w) * 5).toFixed(1)) };
  });
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.gridline} />
        <XAxis dataKey="window" tick={axisTick()} />
        <YAxis tick={axisTick()} label={{ value: "SC probability (%)", angle: -90, position: "insideLeft", fontSize: 10, fill: C.sub }} />
        <Tooltip contentStyle={tooltipStyle()} />
        <Bar dataKey="chance" fill={C.amber} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Approximate F1 Fantasy-style scoring: race points (standard 25-18-15...) +
// a small qualifying bonus + a positions-gained bonus. Illustrative, not the
// official rulebook, but shaped the same way — built for fantasy players.
const F1_POINTS_TABLE = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
function ExpectedFantasyPointsChart({ field }) {
  const top10 = field.slice(0, 10);
  const data = top10.map((d, i) => {
    const raceValue = F1_POINTS_TABLE[i] || 0;
    const qualiBonus = d.grid ? Math.max(0, 4 - Math.floor((d.grid - 1) / 3)) : 1;
    const overtakeBonus = d.grid ? Math.max(0, (d.grid - (i + 1)) * 0.8) : 0;
    const expected = Number(((raceValue + qualiBonus + overtakeBonus) * d.prob * top10.length * 0.12 + raceValue * 0.15).toFixed(1));
    return { code: d.code, points: Math.max(0, expected), color: d.color };
  });
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.gridline} />
        <XAxis dataKey="code" tick={axisTick()} />
        <YAxis tick={axisTick()} label={{ value: "Est. fantasy points", angle: -90, position: "insideLeft", fontSize: 10, fill: C.sub }} />
        <Tooltip contentStyle={tooltipStyle()} />
        <Bar dataKey="points" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// --- TARGET-SPECIFIC EXTRAS (Win / Podium / Points) --------------------------
function WinOddsChart({ field }) {
  const top8 = field.slice(0, 8);
  const data = top8.map((d) => ({ code: d.code, odds: Number((Math.max(0.2, (1 - d.prob) / Math.max(0.01, d.prob))).toFixed(1)), color: d.color }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 6, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.gridline} horizontal={false} />
        <XAxis type="number" tick={axisTick()} label={{ value: "Odds against (X-to-1)", position: "insideBottom", offset: -5, fontSize: 10, fill: C.sub }} />
        <YAxis type="category" dataKey="code" width={44} tick={{ fontSize: 11, fill: C.text, fontWeight: 600 }} />
        <Tooltip contentStyle={tooltipStyle()} formatter={(v) => [`${v}-to-1`, "Odds"]} />
        <Bar dataKey="odds" radius={[0, 6, 6, 0]}>
          {data.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function TeamPodiumChanceChart({ field }) {
  const byTeam = {};
  field.forEach((d) => {
    byTeam[d.teamId] = byTeam[d.teamId] || { name: d.teamName, color: d.color, probs: [] };
    byTeam[d.teamId].probs.push(d.prob);
  });
  const data = Object.values(byTeam).map((t) => ({
    name: t.name, color: t.color,
    chance: Number((1 - t.probs.reduce((acc, p) => acc * (1 - Math.min(0.95, p * 3)), 1)) * 100).toFixed(1),
  })).sort((a, b) => b.chance - a.chance).slice(0, 8);
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 6, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.gridline} horizontal={false} />
        <XAxis type="number" tick={axisTick()} label={{ value: "≥1 podium chance (%)", position: "insideBottom", offset: -5, fontSize: 10, fill: C.sub }} />
        <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10, fill: C.text }} />
        <Tooltip contentStyle={tooltipStyle()} />
        <Bar dataKey="chance" radius={[0, 6, 6, 0]}>
          {data.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function PointsCutoffChart({ field }) {
  const zone = field.slice(6, 13); // P7-P13: the real fight for the last points spots
  const data = zone.map((d, i) => ({ code: d.code, prob: Number((d.prob * 100).toFixed(1)), color: d.color, isCutoff: i === 3 }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.gridline} />
        <XAxis dataKey="code" tick={axisTick()} />
        <YAxis tick={axisTick()} label={{ value: "Points probability (%)", angle: -90, position: "insideLeft", fontSize: 10, fill: C.sub }} />
        <Tooltip contentStyle={tooltipStyle()} />
        <Bar dataKey="prob" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => <Cell key={i} fill={d.isCutoff ? C.red : d.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function cutoffLabel(session, subSession) {
  if (session !== "qualifying") return null;
  if (subSession === "Q1") return { at: 15, label: "Q2 CUTOFF" };
  if (subSession === "Q2") return { at: 10, label: "Q3 CUTOFF" };
  return null;
}

function ResultsGrid({ session, subSession, target, field, pace, compact }) {
  const rows = session === "practice" ? pace : field;
  const py = compact ? "py-1" : "py-2.5";
  const cutoff = cutoffLabel(session, subSession);
  return (
    <div className="rounded-xl overflow-hidden shadow-sm" style={{ border: `1px solid ${C.border}` }}>
      <div className="hidden sm:grid fs-10 uppercase tracking-widest font-bold px-4 py-2"
        style={{ gridTemplateColumns: "36px 44px 1fr 120px 60px 70px 60px", background: C.surfaceAlt, color: C.sub }}>
        <span>#</span><span></span><span>Driver</span>
        <span>{session === "practice" ? "Gap" : "Probability"}</span>
        <span>{session === "practice" ? "Deg" : "Δ"}</span>
        <span>Form</span>
        <span>{session === "practice" ? "" : "DNF"}</span>
      </div>
      {rows.map((d, i) => (
        <React.Fragment key={d.code}>
          {cutoff && i === cutoff.at && (
            <div className="fs-10 uppercase tracking-widest font-bold text-center py-1" style={{ background: C.redTint, color: C.red, borderTop: `1px dashed ${C.red}` }}>
              {cutoff.label}
            </div>
          )}
          <div className={`grid-row f1-row7 items-center gap-2 px-4 ${py} text-sm`}
            style={{ background: C.surface, borderTop: `1px solid ${C.border}` }}>
            <span className="f1-mono font-bold" style={{ color: i < (session === "practice" ? 3 : target.sum) ? C.text : C.muted }}>{i + 1}</span>
            <span className="w-2.5 h-6 rounded-sm justify-self-start" style={{ background: d.color }} />
            <span className="flex flex-col sm:flex-row sm:items-center sm:gap-2 min-w-0">
              <span className="f1-mono font-bold tracking-wide" style={{ color: C.text }}>{d.code}</span>
              <span className="text-xs truncate" style={{ color: C.sub }}>{d.name} · {d.teamName}</span>
            </span>

            {session === "practice" ? (
              <span className="col-span-3 sm:col-span-1 mt-1.5 sm:mt-0 f1-mono text-sm font-semibold" style={{ color: i === 0 ? C.green : C.text }}>
                {i === 0 ? "LEAD" : `+${d.gap.toFixed(3)}s`}
              </span>
            ) : (
              <span className="col-span-3 sm:col-span-1 mt-1.5 sm:mt-0">
                <span className="relative block h-2 rounded-full overflow-hidden" style={{ background: C.surfaceAlt }}>
                  <span className="absolute left-0 top-0 h-full rounded-full" style={{ width: `${Math.min(100, d.prob * 100)}%`, background: d.color }} />
                </span>
                <span className="f1-mono fs-11 sm:hidden" style={{ color: C.sub }}>{(d.prob * 100).toFixed(1)}%</span>
              </span>
            )}

            {session === "practice" ? (
              <span className="hidden sm:flex f1-mono fs-11 items-center font-semibold" style={{ color: riskColor(d.tyreDeg) }}>{d.tyreDeg}</span>
            ) : (
              <span className="hidden sm:flex f1-mono text-xs items-center gap-1 font-semibold" style={{ color: d.delta >= 0 ? C.green : C.red }}>
                {d.delta >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}{Math.abs(d.delta).toFixed(1)}
              </span>
            )}

            <Sparkline form={d.form} />

            {session === "practice" ? <span /> : (
              <span className="hidden sm:flex items-center gap-1.5 f1-mono fs-11 font-semibold" style={{ color: riskColor(d.dnfRisk) }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: riskColor(d.dnfRisk) }} />{d.dnfRisk}
              </span>
            )}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

// ===========================================================================
// H2H TAB
// ===========================================================================
function H2HRadar({ a, b, attrsA, attrsB, attrLabels }) {
  const data = attrLabels.map((x) => ({
    attribute: x.label,
    [a.code]: attrsA[x.key],
    [b.code]: attrsB[x.key],
  }));
  return (
    <ResponsiveContainer width="100%" height={360}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke={C.gridline} />
        <PolarAngleAxis dataKey="attribute" tick={{ fontSize: 11, fill: C.sub }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: C.muted }} />
        <Radar name={a.code} dataKey={a.code} stroke={a.color} fill={a.color} fillOpacity={0.35} />
        <Radar name={b.code} dataKey={b.code} stroke={b.color} fill={b.color} fillOpacity={0.35} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Tooltip contentStyle={tooltipStyle()} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

function H2HTab() {
  const [aCode, setACode] = useState("VER");
  const [bCode, setBCode] = useState("NOR");
  const a = FLAT_DRIVERS.find((d) => d.code === aCode);
  const b = FLAT_DRIVERS.find((d) => d.code === bCode);
  const attrsA = subAttributes(a);
  const attrsB = subAttributes(b);
  const pAheadOfB = h2hProb(a, b);
  const attrLabels = [
    { key: "pace", label: "Raw Pace" },
    { key: "racecraft", label: "Racecraft" },
    { key: "consistency", label: "Consistency" },
    { key: "wet", label: "Wet Weather" },
    { key: "tyre", label: "Tyre Management" },
  ];

  const [raceScope, setRaceScope] = useState("overall");
  const scopedRace = raceScope === "overall" ? null : CALENDAR.find((r) => String(r.round) === raceScope);
  const roundResult = useRaceResult(scopedRace?.status === "completed" ? scopedRace.round : null);
  const isScoped = !!scopedRace;
  const scopedIsLive = isScoped && roundResult.status === "success";

  let raceCompare = null;
  if (isScoped) {
    if (scopedIsLive) {
      const ra = roundResult.results.find((r) => r.code === aCode);
      const rb = roundResult.results.find((r) => r.code === bCode);
      if (ra && rb) raceCompare = { a: ra, b: rb, live: true };
    } else {
      const field = computeField("points", scopedRace.id, "dry");
      const ra = field.find((d) => d.code === aCode);
      const rb = field.find((d) => d.code === bCode);
      const rank = field.map((d) => d.code);
      if (ra && rb) raceCompare = {
        a: { position: rank.indexOf(aCode) + 1, points: Math.round(ra.prob * 25), status: "Projected" },
        b: { position: rank.indexOf(bCode) + 1, points: Math.round(rb.prob * 25), status: "Projected" },
        live: false,
      };
    }
  }

  return (
    <section className="px-4 sm:px-8 py-6">
      <div className="flex items-end gap-3 mb-5">
        <div className="relative rounded-xl flex items-center justify-center overflow-hidden" style={{ flex: 1, height: 120, background: C.surfaceAlt, border: `2px dashed ${C.border}` }}>
          <span className="absolute top-2 left-2 fs-9 font-bold uppercase tracking-widest px-1.5 py-0.5 rounded text-white" style={{ background: a.color }}>{a.code}</span>
          <div className="flex flex-col items-center gap-1 px-2 text-center">
            <ImageIcon size={20} style={{ color: C.muted }} />
            <span className="fs-9 uppercase tracking-widest font-semibold" style={{ color: C.muted }}>{a.name} photo slot</span>
          </div>
        </div>
        <span className="f1-display font-black text-xl flex-shrink-0" style={{ color: C.muted }}>VS</span>
        <div className="relative rounded-xl flex items-center justify-center overflow-hidden" style={{ flex: 1, height: 120, background: C.surfaceAlt, border: `2px dashed ${C.border}` }}>
          <span className="absolute top-2 left-2 fs-9 font-bold uppercase tracking-widest px-1.5 py-0.5 rounded text-white" style={{ background: b.color }}>{b.code}</span>
          <div className="flex flex-col items-center gap-1 px-2 text-center">
            <ImageIcon size={20} style={{ color: C.muted }} />
            <span className="fs-9 uppercase tracking-widest font-semibold" style={{ color: C.muted }}>{b.name} photo slot</span>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <div className="fs-11 uppercase tracking-widest font-bold" style={{ color: C.sub }}>Driver vs. Driver</div>
        <div style={{ width: 260 }}><RaceScopeSelect value={raceScope} onChange={setRaceScope} /></div>
        {isScoped && roundResult.status === "loading" && (
          <span className="fs-10 font-semibold flex items-center gap-1.5 px-2 py-1 rounded" style={{ color: C.sub, background: C.surfaceAlt }}>
            <Loader2 size={11} className="animate-spin" /> Fetching…
          </span>
        )}
        {scopedIsLive && (
          <span className="fs-10 font-semibold flex items-center gap-1.5 px-2 py-1 rounded" style={{ color: C.green, background: C.redTint }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: C.green }} /> Live · Jolpica API
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5 max-w-2xl">
        <Select value={aCode} onChange={setACode} placeholder="Driver A" options={FLAT_DRIVERS.map((d) => ({ value: d.code, label: `${d.name} (${d.teamName})` }))} />
        <Select value={bCode} onChange={setBCode} placeholder="Driver B" options={FLAT_DRIVERS.map((d) => ({ value: d.code, label: `${d.name} (${d.teamName})` }))} />
      </div>

      {isScoped && (
        <div className="rounded-xl p-4 shadow-sm mb-4" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <div className="f1-display font-bold mb-1" style={{ color: C.text }}>{scopedRace.name} — {raceCompare?.live ? "Result" : "Projection"}</div>
          {!raceCompare ? (
            <p className="text-xs" style={{ color: C.sub }}>No data available for this matchup at this race.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 mt-2">
              {[{ d: a, r: raceCompare.a }, { d: b, r: raceCompare.b }].map(({ d, r }) => (
                <div key={d.code} className="rounded-lg p-3" style={{ background: C.surfaceAlt }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-5 rounded-sm" style={{ background: d.color }} />
                    <span className="f1-display font-bold text-sm" style={{ color: C.text }}>{d.name}</span>
                  </div>
                  <div className="f1-mono text-2xl font-bold" style={{ color: C.text }}>P{r.position}</div>
                  <div className="fs-11" style={{ color: C.sub }}>{r.points} pts · {r.status}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl p-5 shadow-sm" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <div className="flex items-center justify-between mb-6">
            <DriverBadge d={a} align="left" />
            <span className="f1-display text-xl font-black" style={{ color: C.muted }}>VS</span>
            <DriverBadge d={b} align="right" />
          </div>

          <div className="space-y-4">
            {attrLabels.map(({ key, label }) => (
              <div key={key}>
                <div className="flex items-center justify-between fs-11 font-semibold mb-1" style={{ color: C.sub }}>
                  <span className="f1-mono">{attrsA[key]}</span>
                  <span className="uppercase tracking-widest">{label}</span>
                  <span className="f1-mono">{attrsB[key]}</span>
                </div>
                <div className="flex h-2 rounded-full overflow-hidden" style={{ background: C.surfaceAlt }}>
                  <div className="h-full" style={{ width: `${attrsA[key] / 2}%`, background: a.color, marginLeft: `${50 - attrsA[key] / 2}%` }} />
                  <div className="h-full" style={{ width: `${attrsB[key] / 2}%`, background: b.color }} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t" style={{ borderColor: C.border }}>
            <div className="fs-11 uppercase tracking-widest font-semibold mb-1" style={{ color: C.sub }}>Season-long finish probability</div>
            <div className="relative h-3 rounded-full overflow-hidden" style={{ background: C.surfaceAlt }}>
              <div className="absolute left-0 top-0 h-full" style={{ width: `${pAheadOfB * 100}%`, background: a.color }} />
              <div className="absolute right-0 top-0 h-full" style={{ width: `${(1 - pAheadOfB) * 100}%`, background: b.color }} />
            </div>
            <div className="flex items-center justify-between mt-2 f1-mono text-sm font-semibold" style={{ color: C.text }}>
              <span>{(pAheadOfB * 100).toFixed(0)}% {a.code}</span>
              <span>{((1 - pAheadOfB) * 100).toFixed(0)}% {b.code}</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl p-5 shadow-sm" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <div className="f1-display font-bold mb-1" style={{ color: C.text }}>Attribute Radar</div>
          <p className="text-xs mb-2" style={{ color: C.sub }}>Same five attributes, plotted as a spider chart for quick shape comparison.</p>
          <H2HRadar a={a} b={b} attrsA={attrsA} attrsB={attrsB} attrLabels={attrLabels} />
        </div>
      </div>
    </section>
  );
}
function DriverBadge({ d, align }) {
  return (
    <div className={`flex items-center gap-2 ${align === "right" ? "flex-row-reverse text-right" : ""}`}>
      <ImgSlot size={44} label="Driver headshot slot" />
      <div>
        <div className="f1-display font-bold" style={{ color: C.text }}>{d.name}</div>
        <div className="fs-11" style={{ color: C.sub }}>{d.teamName} · #{d.number}</div>
      </div>
    </div>
  );
}

// ===========================================================================
// CONSTRUCTORS TAB
// ===========================================================================
function ConstructorsBarChart({ standings }) {
  const data = standings.map((t) => ({ name: t.name, points: t.points, color: t.color }));
  return (
    <ResponsiveContainer width="100%" height={380}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 6, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.gridline} horizontal={false} />
        <XAxis type="number" tick={axisTick()} label={{ value: "Points (illustrative)", position: "insideBottom", offset: -5, fontSize: 11, fill: C.sub }} />
        <YAxis type="category" dataKey="name" width={112} tick={{ fontSize: 11, fill: C.text }} />
        <Tooltip contentStyle={tooltipStyle()} />
        <Bar dataKey="points" radius={[0, 6, 6, 0]}>
          {data.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function ConstructorsTab() {
  const overallStandings = useMemo(() => {
    return TEAMS.map((t) => {
      const avg = t.drivers.reduce((s, d) => s + d.strength, 0) / t.drivers.length;
      const podiumChance = 1 - t.drivers.reduce((acc, d) => acc * (1 - Math.min(0.9, (d.strength / 100) ** 3)), 1);
      const points = Math.round(avg * 8.7);
      const delta = (seededRandom(t.id + "trend") - 0.45) * 10;
      return { ...t, avg, podiumChance, points, delta };
    }).sort((a, b) => b.points - a.points);
  }, []);

  const [raceScope, setRaceScope] = useState("overall");
  const scopedRace = raceScope === "overall" ? null : CALENDAR.find((r) => String(r.round) === raceScope);
  const roundResult = useRaceResult(scopedRace?.status === "completed" ? scopedRace.round : null);
  const isScoped = !!scopedRace;
  const scopedIsLive = isScoped && roundResult.status === "success";

  const scopedStandings = useMemo(() => {
    if (!isScoped) return [];
    const perDriver = scopedIsLive
      ? roundResult.results.map((r) => ({ teamName: r.teamName, points: r.points, constructorId: r.constructorId }))
      : computeField("points", scopedRace.id, "dry").map((d, i) => ({ teamName: d.teamName, points: Math.round(d.prob * 25), constructorId: d.teamId }));
    const byTeam = {};
    perDriver.forEach((r) => {
      const team = TEAMS.find((t) => t.id === r.constructorId || t.name === r.teamName) || { id: r.teamName, name: r.teamName, color: C.muted };
      byTeam[team.id] = byTeam[team.id] || { ...team, points: 0 };
      byTeam[team.id].points += r.points;
    });
    return Object.values(byTeam).sort((a, b) => b.points - a.points);
  }, [isScoped, scopedIsLive, roundResult, scopedRace]);

  const standings = isScoped ? scopedStandings : overallStandings;

  return (
    <section className="px-4 sm:px-8 py-6">
      <ImageBannerRow slots={standings.slice(0, 3).map((t, i) => ({ label: `${t.name} garage slot`, badge: `#${i + 1}`, height: 110 }))} />
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="fs-11 uppercase tracking-widest font-bold" style={{ color: C.sub }}>Constructors</div>
          <div style={{ width: 260 }}><RaceScopeSelect value={raceScope} onChange={setRaceScope} /></div>
        </div>
        {isScoped && roundResult.status === "loading" && (
          <span className="fs-10 font-semibold flex items-center gap-1.5 px-2 py-1 rounded" style={{ color: C.sub, background: C.surfaceAlt }}>
            <Loader2 size={11} className="animate-spin" /> Fetching {scopedRace.name}…
          </span>
        )}
        {scopedIsLive && (
          <span className="fs-10 font-semibold flex items-center gap-1.5 px-2 py-1 rounded" style={{ color: C.green, background: C.redTint }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: C.green }} /> Live result · Jolpica API
          </span>
        )}
        {isScoped && !scopedIsLive && roundResult.status !== "loading" && (
          <span className="fs-10 font-semibold flex items-center gap-1.5 px-2 py-1 rounded" style={{ color: C.amber, background: C.surfaceAlt }}>
            <AlertTriangle size={11} /> {scopedRace.status === "upcoming" ? "Not run yet — showing projection" : "Live fetch failed — showing projection"}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="rounded-xl p-4 shadow-sm" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <div className="f1-display font-bold mb-2" style={{ color: C.text }}>{isScoped ? `Points — ${scopedRace.name}` : "Points Overview"}</div>
          <ConstructorsBarChart standings={standings} />
        </div>
        <ImagePlaceholder label="Constructors banner / livery image slot" minHeight={380} />
      </div>

      <div className="fs-11 uppercase tracking-widest font-bold mb-3" style={{ color: C.sub }}>
        {isScoped ? `${scopedRace.name} — ${scopedIsLive ? "Real" : "Projected"} Constructor Points` : "Illustrative Constructors' Standings"}
      </div>
      <div className="rounded-xl overflow-hidden shadow-sm" style={{ border: `1px solid ${C.border}` }}>
        <div className="hidden sm:grid fs-10 uppercase tracking-widest font-bold px-4 py-2"
          style={{ gridTemplateColumns: isScoped ? "36px 44px 1fr 100px" : "36px 44px 1fr 100px 120px 90px", background: C.surfaceAlt, color: C.sub }}>
          <span>#</span><span></span><span>Constructor</span><span>Points</span>{!isScoped && (<><span>Podium chance</span><span>Trend</span></>)}
        </div>
        {standings.map((t, i) => (
          <div key={t.id} className={isScoped ? "grid-row constructor-row-scoped grid-cols-2 items-center gap-2 px-4 py-3 text-sm" : "grid-row constructor-row grid-cols-2 items-center gap-2 px-4 py-3 text-sm"}
            style={{ background: C.surface, borderTop: `1px solid ${C.border}` }}>
            <span className="f1-mono font-bold" style={{ color: C.text }}>{i + 1}</span>
            <ImgSlot size={28} shape="square" label="Team logo slot" />
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-6 rounded-sm" style={{ background: t.color }} />
              <span className="f1-display font-bold" style={{ color: C.text }}>{t.name}</span>
            </span>
            <span className="f1-mono font-bold" style={{ color: C.text }}>{t.points}</span>
            {!isScoped && (
              <>
                <span className="hidden sm:block">
                  <span className="relative block h-2 rounded-full overflow-hidden" style={{ background: C.surfaceAlt }}>
                    <span className="absolute left-0 top-0 h-full rounded-full" style={{ width: `${t.podiumChance * 100}%`, background: t.color }} />
                  </span>
                </span>
                <span className="hidden sm:flex f1-mono text-xs items-center gap-1 font-semibold" style={{ color: t.delta >= 0 ? C.green : C.red }}>
                  {t.delta >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}{Math.abs(t.delta).toFixed(1)}
                </span>
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ===========================================================================
// STANDINGS / RESULTS TAB — championship battle chart, drivers' table, and a
// recent-results strip. Borrows F1.com's "Standings" + "Latest Results" pages.
// ===========================================================================
function PointsProgressionChart({ rows, drivers }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={rows} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.gridline} />
        <XAxis dataKey="round" tick={axisTick()} />
        <YAxis tick={axisTick()} />
        <Tooltip contentStyle={tooltipStyle()} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {drivers.map((d) => (
          <Line key={d.code} type="monotone" dataKey={d.code} name={d.code} stroke={d.color} strokeWidth={2} dot={{ r: 2 }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

const PIE_COLORS = ["#E10600", "#9D4EDD", "#1DA36B", "#D97B0A", "#1E88E5", "#EC4899", "#9198A1"];

function PointsSharePie({ data }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
          {data.map((d, i) => <Cell key={i} fill={d.color || PIE_COLORS[i % PIE_COLORS.length]} />)}
        </Pie>
        <Tooltip contentStyle={tooltipStyle()} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// Live 2026 standings via the Jolpica API (Ergast-compatible, free, no auth) —
// https://github.com/jolpica/jolpica-f1. Falls back to the illustrative
// model if the fetch fails (offline, rate-limited, or season not yet indexed).
function useLiveStandings(season) {
  const effSeason = season || _apiConfig.season;
  const [state, setState] = useState({ status: "loading", drivers: null, constructors: null, round: null, fetchedAt: null });

  const fetchNow = useCallback(() => {
    if (_apiConfig.forceSimulated) {
      setState({ status: "error", drivers: null, constructors: null, round: null, fetchedAt: null });
      return () => {};
    }
    let cancelled = false;
    setState((s) => ({ ...s, status: "loading" }));
    (async () => {
      try {
        const [dRes, cRes] = await Promise.all([
          fetch(`https://api.jolpi.ca/ergast/f1/${effSeason}/driverstandings/?format=json`),
          fetch(`https://api.jolpi.ca/ergast/f1/${effSeason}/constructorstandings/?format=json`),
        ]);
        if (!dRes.ok || !cRes.ok) throw new Error("Non-OK response from Jolpica");
        const [dJson, cJson] = await Promise.all([dRes.json(), cRes.json()]);
        const dList = dJson?.MRData?.StandingsTable?.StandingsLists?.[0];
        const cList = cJson?.MRData?.StandingsTable?.StandingsLists?.[0];
        if (!dList || !cList) throw new Error("Season not yet indexed by Jolpica");
        const drivers = dList.DriverStandings.map((ds) => ({
          position: Number(ds.position),
          points: Number(ds.points),
          wins: Number(ds.wins),
          code: ds.Driver.code,
          name: `${ds.Driver.givenName} ${ds.Driver.familyName}`,
          teamName: ds.Constructors?.[0]?.name,
        }));
        const constructors = cList.ConstructorStandings.map((cs) => ({
          position: Number(cs.position),
          points: Number(cs.points),
          wins: Number(cs.wins),
          name: cs.Constructor.name,
          constructorId: cs.Constructor.constructorId,
        }));
        if (!cancelled) setState({ status: "success", drivers, constructors, round: dList.round, fetchedAt: Date.now() });
      } catch (e) {
        if (!cancelled) setState((s) => ({ ...s, status: "error" }));
      }
    })();
    return () => { cancelled = true; };
  }, [effSeason]);

  useEffect(() => fetchNow(), [fetchNow]);
  return { ...state, refresh: fetchNow };
}

// Real per-round results from Jolpica (completed races only). `round` is a
// FIA round number (1-23) or null/undefined for "no specific race" (idle).
function useRaceResult(round, season) {
  const effSeason = season || _apiConfig.season;
  const [state, setState] = useState({ status: "idle", results: null, raceName: null });
  useEffect(() => {
    if (!round) { setState({ status: "idle", results: null, raceName: null }); return; }
    if (_apiConfig.forceSimulated) { setState({ status: "error", results: null, raceName: null }); return; }
    let cancelled = false;
    setState({ status: "loading", results: null, raceName: null });
    (async () => {
      try {
        const res = await fetch(`https://api.jolpi.ca/ergast/f1/${effSeason}/${round}/results/?format=json`);
        if (!res.ok) throw new Error("Non-OK response from Jolpica");
        const json = await res.json();
        const race = json?.MRData?.RaceTable?.Races?.[0];
        if (!race || !race.Results?.length) throw new Error("No results indexed for this round yet");
        const results = race.Results.map((r) => ({
          position: Number(r.position),
          points: Number(r.points),
          grid: Number(r.grid),
          code: r.Driver.code,
          name: `${r.Driver.givenName} ${r.Driver.familyName}`,
          teamName: r.Constructor.name,
          constructorId: r.Constructor.constructorId,
          status: r.status,
        }));
        if (!cancelled) setState({ status: "success", results, raceName: race.raceName });
      } catch (e) {
        if (!cancelled) setState({ status: "error", results: null, raceName: null });
      }
    })();
    return () => { cancelled = true; };
  }, [round, effSeason]);
  return state;
}

// Real Q1-Q3 grid order for completed races (Jolpica qualifying endpoint) —
// used to auto-fill Sunday's starting grid so the race model can weight it.
function useQualifyingResult(round, season) {
  const effSeason = season || _apiConfig.season;
  const [state, setState] = useState({ status: "idle", grid: null });
  useEffect(() => {
    if (!round) { setState({ status: "idle", grid: null }); return; }
    if (_apiConfig.forceSimulated) { setState({ status: "error", grid: null }); return; }
    let cancelled = false;
    setState({ status: "loading", grid: null });
    (async () => {
      try {
        const res = await fetch(`https://api.jolpi.ca/ergast/f1/${effSeason}/${round}/qualifying/?format=json`);
        if (!res.ok) throw new Error("Non-OK response from Jolpica");
        const json = await res.json();
        const race = json?.MRData?.RaceTable?.Races?.[0];
        if (!race || !race.QualifyingResults?.length) throw new Error("No qualifying indexed for this round yet");
        const grid = {};
        race.QualifyingResults.forEach((r) => { grid[r.Driver.code] = Number(r.position); });
        if (!cancelled) setState({ status: "success", grid });
      } catch (e) {
        if (!cancelled) setState({ status: "error", grid: null });
      }
    })();
    return () => { cancelled = true; };
  }, [round, effSeason]);
  return state;
}

// Empirical basis: pole position has converted to a race win ~42-43% of the
// time across F1 history (higher — around 70% — in recent seasons), and the
// large majority of winners start from the top 5. This curve translates grid
// position into a multiplier on race-win/points likelihood; gridWeight (0-100,
// tunable in Settings) controls how strongly it's blended in.
function gridPriorMultiplier(gridPos) {
  if (!gridPos || gridPos < 1) return 1;
  return 1 / (1 + (gridPos - 1) * 0.16);
}

// Shared "Overall (Season) vs. specific race" dropdown used by Standings,
// H2H and Constructors so all three can be scoped the same way.
function RaceScopeSelect({ value, onChange }) {
  const options = [
    { value: "overall", label: "🏆 Overall (Season)" },
    ...CALENDAR.map((r) => ({ value: String(r.round), label: `${r.flag} R${r.round} · ${r.name}${r.status === "completed" ? "" : " (upcoming)"}` })),
  ];
  return <Select value={value} onChange={onChange} placeholder="Scope" options={options} />;
}

function GridVsFinishChart({ rows }) {
  const data = rows.slice(0, 12).map((r) => ({ code: r.code, delta: (r.grid || 0) - r.position, color: (FLAT_DRIVERS.find((d) => d.code === r.code) || {}).color || C.muted }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.gridline} />
        <XAxis dataKey="code" tick={axisTick()} />
        <YAxis tick={axisTick()} label={{ value: "Places gained (grid → finish)", angle: -90, position: "insideLeft", fontSize: 10, fill: C.sub }} />
        <Tooltip contentStyle={tooltipStyle()} />
        <Bar dataKey="delta" radius={[4, 4, 4, 4]}>
          {data.map((d, i) => <Cell key={i} fill={d.delta >= 0 ? C.green : C.red} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function StandingsTab() {
  const live = useLiveStandings(2026);
  const fallbackStandings = useMemo(() => driversStandings(), []);
  const progression = useMemo(() => pointsProgression(6), []);
  const results = useMemo(() => recentResults(3), []);

  const [raceScope, setRaceScope] = useState("overall");
  const scopedRace = raceScope === "overall" ? null : CALENDAR.find((r) => String(r.round) === raceScope);
  const roundResult = useRaceResult(scopedRace?.status === "completed" ? scopedRace.round : null);

  const isScoped = !!scopedRace;
  const scopedIsLive = isScoped && roundResult.status === "success";
  const scopedSimulated = useMemo(
    () => (isScoped && !scopedIsLive ? computeField("points", scopedRace.id, "dry") : []),
    [isScoped, scopedIsLive, scopedRace]
  );

  const usingLive = !isScoped && live.status === "success";
  const rows = isScoped
    ? scopedIsLive
      ? roundResult.results.map((r) => ({ ...r, color: (FLAT_DRIVERS.find((d) => d.code === r.code) || {}).color || C.muted }))
      : scopedSimulated.map((d, i) => ({ position: i + 1, points: Math.round(d.prob * 25), grid: i + 1 + Math.round((seededRandom(d.code + "grid") - 0.5) * 4), code: d.code, name: d.name, teamName: d.teamName, color: d.color, status: "Projected" }))
    : usingLive
      ? live.drivers.map((ld) => { const match = FLAT_DRIVERS.find((d) => d.code === ld.code); return { ...ld, color: match?.color || C.muted, delta: 0 }; })
      : fallbackStandings;

  const pieData = isScoped
    ? Object.values(rows.reduce((acc, r) => {
        acc[r.teamName] = acc[r.teamName] || { name: r.teamName, value: 0, color: r.color };
        acc[r.teamName].value += r.points;
        return acc;
      }, {}))
    : usingLive
      ? live.constructors.slice(0, 7).map((c) => ({ name: c.name, value: c.points, color: TEAMS.find((t) => c.constructorId?.includes(t.id) || t.name === c.name)?.color }))
      : TEAMS.map((t) => ({ name: t.name, value: t.drivers.reduce((s, d) => s + d.strength, 0), color: t.color }));

  return (
    <section className="px-4 sm:px-8 py-6">
      <PodiumImageBanner />
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="fs-11 uppercase tracking-widest font-bold" style={{ color: C.sub }}>2026 Championship</div>
          <div style={{ width: 260 }}><RaceScopeSelect value={raceScope} onChange={setRaceScope} /></div>
        </div>
        <div className="flex items-center gap-2">
          {!isScoped && live.status === "loading" && (
            <span className="fs-10 font-semibold flex items-center gap-1.5 px-2 py-1 rounded" style={{ color: C.sub, background: C.surfaceAlt }}>
              <Loader2 size={11} className="animate-spin" /> Fetching live standings…
            </span>
          )}
          {usingLive && (
            <span className="fs-10 font-semibold flex items-center gap-1.5 px-2 py-1 rounded" style={{ color: C.green, background: C.redTint }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: C.green }} /> Live · Jolpica API · Round {live.round}
            </span>
          )}
          {!isScoped && live.status === "error" && (
            <span className="fs-10 font-semibold flex items-center gap-1.5 px-2 py-1 rounded" style={{ color: C.amber, background: C.surfaceAlt }}>
              <AlertTriangle size={11} /> Live fetch failed — showing illustrative fallback
            </span>
          )}
          {isScoped && roundResult.status === "loading" && (
            <span className="fs-10 font-semibold flex items-center gap-1.5 px-2 py-1 rounded" style={{ color: C.sub, background: C.surfaceAlt }}>
              <Loader2 size={11} className="animate-spin" /> Fetching {scopedRace.name} result…
            </span>
          )}
          {scopedIsLive && (
            <span className="fs-10 font-semibold flex items-center gap-1.5 px-2 py-1 rounded" style={{ color: C.green, background: C.redTint }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: C.green }} /> Live result · Jolpica API
            </span>
          )}
          {isScoped && !scopedIsLive && roundResult.status !== "loading" && (
            <span className="fs-10 font-semibold flex items-center gap-1.5 px-2 py-1 rounded" style={{ color: C.amber, background: C.surfaceAlt }}>
              <AlertTriangle size={11} /> {scopedRace.status === "upcoming" ? "Not run yet — showing projection" : "Live fetch failed — showing projection"}
            </span>
          )}
          {!isScoped && (
            <button onClick={live.refresh} className="fs-10 font-semibold flex items-center gap-1 px-2 py-1 rounded" style={{ color: C.sub, background: C.surfaceAlt }}>
              <RefreshCw size={11} /> Refresh
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="rounded-xl p-4 shadow-sm" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          {isScoped ? (
            <>
              <div className="f1-display font-bold mb-1" style={{ color: C.text }}>Grid → Finish</div>
              <p className="text-xs mb-2" style={{ color: C.sub }}>{scopedIsLive ? "Real places gained/lost from grid to finish." : "Projected places gained/lost (simulated)."}</p>
              <GridVsFinishChart rows={rows} />
            </>
          ) : (
            <>
              <div className="f1-display font-bold mb-1" style={{ color: C.text }}>Championship Battle</div>
              <p className="text-xs mb-2" style={{ color: C.sub }}>Simulated cumulative points for the top 6 drivers across the sampled rounds — a trend shape, not live per-round history.</p>
              <PointsProgressionChart rows={progression.rows} drivers={progression.drivers} />
            </>
          )}
        </div>
        <div className="rounded-xl p-4 shadow-sm" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <div className="f1-display font-bold mb-1" style={{ color: C.text }}>
            {isScoped ? `Points Share — ${scopedRace.name}` : usingLive ? "Constructors' Points Share (live)" : "Constructors' Strength Share (illustrative)"}
          </div>
          <p className="text-xs mb-2" style={{ color: C.sub }}>{isScoped ? (scopedIsLive ? "Real points scored by each constructor in this race." : "Projected points share for this race.") : usingLive ? "Real 2026 constructor points, fetched live." : "Model strength shares — connect live data to replace with real points."}</p>
          <PointsSharePie data={pieData} />
        </div>
      </div>

      {!isScoped && (
        <>
          <div className="fs-11 uppercase tracking-widest font-bold mb-2" style={{ color: C.sub }}>Latest Results</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            {results.map(({ race, podium }) => (
              <div key={race.id} className="rounded-xl p-4 shadow-sm" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <span>{race.flag}</span>
                  <span className="f1-display font-bold text-sm" style={{ color: C.text }}>{race.name}</span>
                </div>
                <div className="space-y-1.5">
                  {podium.map((d, i) => (
                    <div key={d.code} className="flex items-center gap-2 text-sm">
                      <span className="f1-mono font-bold" style={{ color: C.sub, width: 16 }}>{i + 1}</span>
                      <span className="w-2 h-4 rounded-sm" style={{ background: d.color }} />
                      <span className="truncate" style={{ color: C.text }}>{d.name}</span>
                    </div>
                  ))}
                </div>
                <div className="fs-9 mt-2" style={{ color: C.muted }}>Simulated podium — not the real race result.</div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="fs-11 uppercase tracking-widest font-bold mb-3" style={{ color: C.sub }}>
        {isScoped ? `${scopedRace.name} — ${scopedIsLive ? "Result" : "Projection"}` : usingLive ? "Live Drivers' Championship" : "Illustrative Drivers' Championship"}
      </div>
      <div className="rounded-xl overflow-hidden shadow-sm" style={{ border: `1px solid ${C.border}` }}>
        <div className="hidden sm:grid fs-10 uppercase tracking-widest font-bold px-4 py-2"
          style={{ gridTemplateColumns: "36px 44px 1fr 100px 90px", background: C.surfaceAlt, color: C.sub }}>
          <span>#</span><span></span><span>Driver</span><span>Points</span><span>{isScoped ? "Status" : usingLive ? "Wins" : "Trend"}</span>
        </div>
        {rows.map((d, i) => (
          <div key={d.code} className="grid-row driver-row grid-cols-2 items-center gap-2 px-4 py-3 text-sm"
            style={{ background: C.surface, borderTop: `1px solid ${C.border}` }}>
            <span className="f1-mono font-bold" style={{ color: C.text }}>{d.position || i + 1}</span>
            <ImgSlot size={28} label="Driver headshot slot" />
            <span className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-6 rounded-sm flex-shrink-0" style={{ background: d.color }} />
              <span className="min-w-0">
                <div className="f1-display font-bold truncate" style={{ color: C.text }}>{d.name}</div>
                <div className="fs-10 truncate" style={{ color: C.sub }}>{d.teamName}</div>
              </span>
            </span>
            <span className="f1-mono font-bold" style={{ color: C.text }}>{d.points}</span>
            {isScoped ? (
              <span className="hidden sm:flex f1-mono fs-10 items-center font-semibold truncate" style={{ color: C.sub }}>{d.status}</span>
            ) : usingLive ? (
              <span className="hidden sm:flex f1-mono text-xs items-center font-semibold" style={{ color: C.sub }}>{d.wins}</span>
            ) : (
              <span className="hidden sm:flex f1-mono text-xs items-center gap-1 font-semibold" style={{ color: d.delta >= 0 ? C.green : C.red }}>
                {d.delta >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}{Math.abs(d.delta).toFixed(1)}
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ===========================================================================
// ANALYTICS TAB
// ===========================================================================
function AccuracyBarChart() {
  const data = TARGETS.map((t) => ({ name: t.short, Model: Math.round(t.accuracy * 100), Baseline: Math.round((t.sum / 22) * 100) }));
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.gridline} />
        <XAxis dataKey="name" tick={axisTick()} />
        <YAxis domain={[0, 100]} tick={axisTick()} />
        <Tooltip contentStyle={tooltipStyle()} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="Model" fill={C.red} radius={[6, 6, 0, 0]} />
        <Bar dataKey="Baseline" fill="#D8DAE0" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
function ConfidenceLineChart({ simPoints }) {
  const data = simPoints.map((p) => ({ label: p.n >= 1000 ? `${p.n / 1000}k` : String(p.n), conf: p.conf }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.gridline} />
        <XAxis dataKey="label" tick={axisTick()} />
        <YAxis domain={[0, 100]} tick={axisTick()} />
        <Tooltip contentStyle={tooltipStyle()} />
        <Line type="monotone" dataKey="conf" name="Confidence %" stroke={C.red} strokeWidth={2} dot={{ r: 4, fill: C.red }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function AnalyticsSettingsTab({ settings, setSettings }) {
  const [sub, setSub] = useState("accuracy");
  const targetId = "podium";
  const target = TARGETS.find((t) => t.id === targetId);
  const simPoints = [500, 2000, 10000, 30000, 75000].map((n) => ({ n, conf: Math.min(96, Math.round(40 + Math.log10(n) * 13)) }));
  const subTabs = [
    { id: "accuracy", label: "Accuracy", icon: BarChart3 },
    { id: "tuning", label: "Model Tuning", icon: SlidersHorizontal },
    { id: "sources", label: "Data Sources & APIs", icon: Database },
    { id: "display", label: "Display & Strategy", icon: SettingsIcon },
  ];

  return (
    <section className="px-4 sm:px-8 py-6">
      <ImageBannerRow slots={[{ label: "🖥️ Race engineering / telemetry wall banner slot", height: 110 }]} />
      <div className="flex flex-wrap gap-1.5 p-1 rounded-lg mb-5 w-fit" style={{ background: C.surfaceAlt, border: `1px solid ${C.border}` }}>
        {subTabs.map((t) => {
          const Icon = t.icon;
          const active = sub === t.id;
          return (
            <button key={t.id} onClick={() => setSub(t.id)}
              className="f1-mono fs-11 px-3 py-1.5 rounded-md uppercase tracking-wide font-semibold flex items-center gap-1.5"
              style={{ background: active ? C.red : "transparent", color: active ? "#fff" : C.sub }}>
              <Icon size={12} /> {t.label}
            </button>
          );
        })}
      </div>

      {sub === "accuracy" && (
        <>
          <div className="rounded-xl p-5 shadow-sm" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
            <div className="flex items-start gap-2 mb-4">
              <Info size={15} style={{ color: C.sub, marginTop: 2 }} />
              <p className="text-xs leading-relaxed" style={{ color: C.sub }}>
                Different questions have different ceilings. Exact-winner prediction fights genuine
                race-day chaos; asking "podium or not" averages that chaos out. Each target below reports
                its own backtested accuracy against its own random-guess baseline — never one blended number.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {TARGETS.map((t) => (
                <div key={t.id} className="text-left rounded-lg p-3" style={{ background: C.surfaceAlt, border: `1px solid ${C.border}` }}>
                  <div className="f1-mono fs-10 uppercase tracking-widest font-bold" style={{ color: C.sub }}>{t.label}</div>
                  <div className="f1-mono text-2xl font-bold mt-1" style={{ color: C.text }}>{(t.accuracy * 100).toFixed(0)}%</div>
                  <div className="fs-10 mt-0.5" style={{ color: C.muted }}>vs {((t.sum / 22) * 100).toFixed(0)}% random baseline</div>
                </div>
              ))}
            </div>
            <p className="text-xs leading-relaxed mb-4" style={{ color: C.sub }}>{target.note}</p>
            <AccuracyBarChart />
          </div>
          <div className="rounded-xl p-5 mt-4 shadow-sm" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
            <div className="f1-display font-bold mb-1" style={{ color: C.text }}>Simulation depth vs. confidence</div>
            <p className="text-xs mb-2" style={{ color: C.sub }}>More Monte Carlo simulations narrow the estimate — with diminishing returns past ~30k runs.</p>
            <ConfidenceLineChart simPoints={simPoints} />
          </div>
        </>
      )}

      {sub === "tuning" && (
        <div className="rounded-xl p-5 space-y-6 shadow-sm max-w-2xl" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <SliderRow label="Chaos level" value={settings.chaosLevel} min={0} max={100} step={5}
            leftLabel="Dominant favourites" rightLabel="Chaotic"
            desc="Controls how sharply race/qualifying probabilities concentrate on the favourites. Applies live."
            onChange={(v) => setSettings((s) => ({ ...s, chaosLevel: v }))} />
          <SliderRow label="Wet-weather influence" value={settings.wetInfluence} min={0} max={100} step={5}
            leftLabel="Ignore wet skill" rightLabel="Wet skill dominates"
            desc="How much a driver's wet-weather reputation overrides season form when weather ≠ dry."
            onChange={(v) => setSettings((s) => ({ ...s, wetInfluence: v }))} />
          <SliderRow label="Reliability influence" value={settings.reliabilityInfluence} min={0} max={100} step={5}
            leftLabel="Ignore reliability" rightLabel="Reliability-sensitive"
            desc="How strongly mechanical/operational reliability drives DNF-risk classification."
            onChange={(v) => setSettings((s) => ({ ...s, reliabilityInfluence: v }))} />
          <SliderRow label="Strategy aggressiveness" value={settings.strategyAggressiveness} min={0} max={100} step={5}
            leftLabel="Conservative (1-stop)" rightLabel="Aggressive (2-stop)"
            desc="Biases the Predicted Pit Strategy panel toward 1-stop or 2-stop plans."
            onChange={(v) => setSettings((s) => ({ ...s, strategyAggressiveness: v }))} />
          <SliderRow label="Grid-position influence" value={settings.gridWeight} min={0} max={100} step={5}
            leftLabel="Car/driver form only" rightLabel="Full grid weighting"
            desc="How much Sunday's prediction leans on the (real or simulated) qualifying grid. Grounded in F1's real ~43% historical pole-to-win rate (higher in recent seasons) — most winners start top 5."
            onChange={(v) => setSettings((s) => ({ ...s, gridWeight: v }))} />
          <div>
            <div className="text-sm font-semibold mb-2" style={{ color: C.text }}>Default simulation count</div>
            <input type="number" min={100} max={100000} step={100} value={settings.defaultSimCount}
              onChange={(e) => setSettings((v) => ({ ...v, defaultSimCount: Math.max(100, Math.min(100000, Number(e.target.value) || 0)) }))}
              className="w-full text-sm rounded-lg px-3 py-2 f1-mono"
              style={{ background: C.surface, color: C.text, border: `1px solid ${C.border}` }} />
          </div>
        </div>
      )}

      {sub === "sources" && (
        <div className="rounded-xl p-5 space-y-5 shadow-sm max-w-2xl" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <div className="flex items-start gap-2">
            <Info size={15} style={{ color: C.sub, marginTop: 2 }} />
            <p className="text-xs leading-relaxed" style={{ color: C.sub }}>
              This demo actually calls the <b>Jolpica API</b> live (Standings, Constructors, H2H). FastF1, OpenF1
              and the Hugging Face dataset represent the real backend's intended data sources for a production
              build — toggling them here shapes this UI's behaviour, but only Jolpica is truly wired up client-side.
            </p>
          </div>

          <div>
            <div className="text-sm font-semibold mb-2" style={{ color: C.text }}>Season</div>
            <input type="number" min={1950} max={2030} value={settings.seasonYear}
              onChange={(e) => setSettings((v) => ({ ...v, seasonYear: Number(e.target.value) || 2026 }))}
              className="w-full text-sm rounded-lg px-3 py-2 f1-mono"
              style={{ background: C.surface, color: C.text, border: `1px solid ${C.border}` }} />
            <div className="fs-11 mt-1" style={{ color: C.muted }}>Changes apply the next time a live-data tab fetches or refreshes.</div>
          </div>

          <ToggleRow label="Force simulated mode" desc="Skip live API calls entirely and always use the illustrative model, even for completed races." value={settings.forceSimulated}
            onChange={(v) => setSettings((s) => ({ ...s, forceSimulated: v }))} />

          <div className="pt-2 border-t space-y-3" style={{ borderColor: C.border }}>
            <div className="text-sm font-semibold" style={{ color: C.text }}>Represented data sources</div>
            {[
              { key: "jolpica", name: "Jolpica API", desc: "Live standings & per-round results — actually fetched in this build." },
              { key: "fastf1", name: "FastF1", desc: "Telemetry & timing (planned backend source)." },
              { key: "openf1", name: "OpenF1", desc: "Live/session timing API (planned backend source)." },
              { key: "huggingface", name: "HF: tracinginsights/RaceData", desc: "Historical archive mirror (planned backend source)." },
              { key: "recharts", name: "Recharts", desc: "Charting engine used throughout this UI." },
            ].map((src) => (
              <ToggleRow key={src.key} label={src.name} desc={src.desc} value={settings.apiSources[src.key]}
                onChange={(v) => setSettings((s) => ({ ...s, apiSources: { ...s.apiSources, [src.key]: v } }))} />
            ))}
          </div>
        </div>
      )}

      {sub === "display" && (
        <div className="rounded-xl p-5 space-y-5 shadow-sm max-w-2xl" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <div>
            <div className="text-sm font-semibold mb-2" style={{ color: C.text }}>Default session on load</div>
            <div className="flex gap-2">
              {SESSIONS.map((s) => (
                <button key={s.id} onClick={() => setSettings((v) => ({ ...v, defaultSession: s.id }))}
                  className="f1-mono fs-11 px-3 py-1.5 rounded-md uppercase tracking-wide font-semibold"
                  style={{ background: settings.defaultSession === s.id ? C.red : C.surfaceAlt, color: settings.defaultSession === s.id ? "#fff" : C.sub }}>
                  {s.label.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold mb-2" style={{ color: C.text }}>Default weather</div>
            <div className="flex gap-2">
              {[{ id: "dry", label: "Dry" }, { id: "mixed", label: "Mixed" }, { id: "wet", label: "Wet" }].map((w) => (
                <button key={w.id} onClick={() => setSettings((v) => ({ ...v, defaultWeather: w.id }))}
                  className="f1-mono fs-11 px-3 py-1.5 rounded-md uppercase tracking-wide font-semibold"
                  style={{ background: settings.defaultWeather === w.id ? C.red : C.surfaceAlt, color: settings.defaultWeather === w.id ? "#fff" : C.sub }}>
                  {w.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold mb-2" style={{ color: C.text }}>Units</div>
            <div className="flex gap-2">
              {[{ id: "metric", label: "Metric (km, °C)" }, { id: "imperial", label: "Imperial (mi, °F)" }].map((u) => (
                <button key={u.id} onClick={() => setSettings((v) => ({ ...v, units: u.id }))}
                  className="f1-mono fs-11 px-3 py-1.5 rounded-md uppercase tracking-wide font-semibold"
                  style={{ background: settings.units === u.id ? C.red : C.surfaceAlt, color: settings.units === u.id ? "#fff" : C.sub }}>
                  {u.label}
                </button>
              ))}
            </div>
          </div>

          <ToggleRow label="Compact grid rows" desc="Tighter row height in prediction tables." value={settings.compactRows}
            onChange={(v) => setSettings((s) => ({ ...s, compactRows: v }))} />
          <ToggleRow label="Reduce motion" desc="Disables the Purple Pick pulse and run-progress animation." value={settings.reducedMotion}
            onChange={(v) => setSettings((s) => ({ ...s, reducedMotion: v }))} />
          <div className="fs-11 pt-2 border-t" style={{ color: C.muted, borderColor: C.border }}>
            Light/dark theme lives in the top-right of the nav bar (☀️/🌙 icon) so it's reachable from every tab.
          </div>
        </div>
      )}
    </section>
  );
}
function SliderRow({ label, value, min, max, step, leftLabel, rightLabel, desc, onChange }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="text-sm font-semibold" style={{ color: C.text }}>{label}</div>
        <span className="f1-mono text-sm font-bold" style={{ color: C.red }}>{value}</span>
      </div>
      <div className="fs-11 mb-2" style={{ color: C.sub }}>{desc}</div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full" style={{ accentColor: C.red }} />
      <div className="flex justify-between fs-9 uppercase tracking-widest font-semibold mt-1" style={{ color: C.muted }}>
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  );
}
function ToggleRow({ label, desc, value, onChange }) {
  return (
    <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: C.border }}>
      <div>
        <div className="text-sm font-semibold" style={{ color: C.text }}>{label}</div>
        <div className="fs-11" style={{ color: C.sub }}>{desc}</div>
      </div>
      <button onClick={() => onChange(!value)} className="w-11 h-6 rounded-full relative flex-shrink-0"
        style={{ background: value ? C.red : "#D8DAE0" }}>
        <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all" style={{ left: value ? 22 : 2 }} />
      </button>
    </div>
  );
}

// ===========================================================================
// FOOTER
// ===========================================================================
// ===========================================================================
// REPORT TAB — real, multi-format export options
// ===========================================================================
function fullSeasonCSV() {
  const header = "Round,Race,Position,Driver,Team,Podium Probability %";
  const rows = [header];
  CALENDAR.forEach((race) => {
    const field = computeField("podium", race.id, "dry");
    field.slice(0, 3).forEach((d, i) => {
      rows.push(`${race.round},${race.name},${i + 1},${d.name},${d.teamName},${(d.prob * 100).toFixed(1)}`);
    });
  });
  return rows.join("\n");
}
function shareableSummary({ session, race, field, pace, runState }) {
  if (runState !== "done" || !race) return "Run a prediction on the Dashboard first to generate a shareable summary.";
  const lines = [`🏁 ${race.name} — ${session.toUpperCase()} projection (Pit Wall Predictor 2026)`, ""];
  const rows = session === "practice" ? pace : field;
  rows.slice(0, 5).forEach((d, i) => {
    lines.push(session === "practice"
      ? `P${i + 1}  ${d.code}  ${i === 0 ? "LEAD" : "+" + d.gap.toFixed(3) + "s"}`
      : `P${i + 1}  ${d.code}  ${(d.prob * 100).toFixed(1)}%`);
  });
  lines.push("", "Illustrative model output — not a real prediction.");
  return lines.join("\n");
}
function printableHTML({ session, race, field, pace, runState }) {
  const rowsHtml = (session === "practice" ? pace : field).slice(0, 10).map((d, i) => `
    <tr>
      <td>${i + 1}</td><td>${d.code}</td><td>${d.name}</td><td>${d.teamName}</td>
      <td>${session === "practice" ? (i === 0 ? "LEAD" : "+" + d.gap.toFixed(3) + "s") : (d.prob * 100).toFixed(1) + "%"}</td>
    </tr>`).join("");
  return `<!DOCTYPE html><html><head><title>${race ? race.name : "Prediction"} Report</title>
    <style>
      body{font-family:Arial,sans-serif;padding:32px;color:#15151E;}
      h1{color:#E10600;margin-bottom:0;} p.sub{color:#6B7280;margin-top:4px;}
      table{width:100%;border-collapse:collapse;margin-top:20px;}
      th,td{text-align:left;padding:8px 10px;border-bottom:1px solid #E3E5EA;font-size:13px;}
      th{text-transform:uppercase;font-size:11px;letter-spacing:0.05em;color:#6B7280;}
      .footer{margin-top:24px;font-size:11px;color:#9AA0AC;}
    </style></head><body>
    <h1>F1 Predictor 2026</h1>
    <p class="sub">${race ? race.name + " — " + session.toUpperCase() : "No race selected"}</p>
    ${runState !== "done" ? "<p>Run a prediction on the Dashboard first.</p>" : `
    <table><thead><tr><th>#</th><th>Code</th><th>Driver</th><th>Team</th><th>${session === "practice" ? "Gap" : "Probability"}</th></tr></thead>
    <tbody>${rowsHtml}</tbody></table>`}
    <p class="footer">Illustrative mock data — not a real prediction. Generated by Pit Wall Predictor 2026.</p>
    </body></html>`;
}

function ReportCard({ icon: Icon, title, desc, actionLabel, onAction, disabled }) {
  return (
    <div className="rounded-xl p-4 shadow-sm flex flex-col" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
      <span className="w-9 h-9 rounded-md flex items-center justify-center mb-3" style={{ background: C.redTint }}>
        <Icon size={16} style={{ color: C.red }} />
      </span>
      <div className="f1-display font-bold mb-1" style={{ color: C.text }}>{title}</div>
      <p className="text-xs mb-4 flex-1" style={{ color: C.sub }}>{desc}</p>
      <button onClick={onAction} disabled={disabled}
        className="text-xs font-bold uppercase tracking-wide px-3 py-2 rounded-lg text-white self-start"
        style={{ background: disabled ? "#D8DAE0" : C.red, cursor: disabled ? "not-allowed" : "pointer" }}>
        {actionLabel}
      </button>
    </div>
  );
}

function ReportTab({ session, race, field, pace, runState }) {
  const [copied, setCopied] = useState(false);
  const live = useLiveStandings();
  const hasPrediction = runState === "done" && !!race;

  function downloadCurrentCSV() {
    const rows = session === "practice"
      ? ["Position,Driver,Team,Gap(s),TyreDeg", ...pace.map((d, i) => `${i + 1},${d.name},${d.teamName},${d.gap.toFixed(3)},${d.tyreDeg}`)].join("\n")
      : ["Position,Driver,Team,Probability%,DNFRisk", ...field.map((d, i) => `${i + 1},${d.name},${d.teamName},${(d.prob * 100).toFixed(1)},${d.dnfRisk}`)].join("\n");
    exportCSV(rows, `${race?.id || "race"}-${session}-prediction.csv`);
  }
  function downloadCurrentJSON() {
    exportJSON({ race, session, generatedAt: new Date().toISOString(), field, pace }, `${race?.id || "race"}-${session}-prediction.json`);
  }
  function downloadFullSeason() {
    exportCSV(fullSeasonCSV(), "f1-2026-full-season-podium-projections.csv");
  }
  function downloadStandings() {
    const rows = live.status === "success"
      ? ["Position,Driver,Team,Points,Wins", ...live.drivers.map((d) => `${d.position},${d.name},${d.teamName},${d.points},${d.wins}`)].join("\n")
      : ["Position,Driver,Team,Points(illustrative)", ...driversStandings().map((d, i) => `${i + 1},${d.name},${d.teamName},${d.points}`)].join("\n");
    exportCSV(rows, "f1-2026-drivers-championship.csv");
  }
  function doPrint() {
    openPrintable(printableHTML({ session, race, field, pace, runState }));
  }
  function doCopy() {
    copyToClipboard(shareableSummary({ session, race, field, pace, runState })).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <section className="px-4 sm:px-8 py-6">
      <ImageBannerRow slots={[
        { label: "📄 Report cover image slot", flex: 1.3, height: 110 },
        { label: "🏆 Podium celebration image slot", flex: 1, height: 110 },
      ]} />
      <div className="fs-11 uppercase tracking-widest font-bold mb-1" style={{ color: C.sub }}>Download Report</div>
      <p className="text-xs mb-5" style={{ color: C.sub }}>
        Export the current prediction, the full season, or the championship — in whichever format is useful to you.
        {!hasPrediction && " Run a prediction on the Dashboard to unlock the current-prediction exports below."}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <ReportCard icon={Download} title="Current Prediction · CSV" disabled={!hasPrediction}
          desc={hasPrediction ? `${race.name} — ${session} projection, spreadsheet-ready.` : "Run a prediction first."}
          actionLabel="Download CSV" onAction={downloadCurrentCSV} />
        <ReportCard icon={Database} title="Current Prediction · JSON" disabled={!hasPrediction}
          desc="Raw structured data for the current projection — handy for feeding into your own tools."
          actionLabel="Download JSON" onAction={downloadCurrentJSON} />
        <ReportCard icon={History} title="Full Season · CSV" disabled={false}
          desc="Podium projection for every 2026 round in one file — a full-season snapshot."
          actionLabel="Download CSV" onAction={downloadFullSeason} />
        <ReportCard icon={Trophy} title="Drivers' Championship · CSV" disabled={false}
          desc={live.status === "success" ? "Live standings from the Jolpica API." : "Illustrative standings (live fetch unavailable)."}
          actionLabel="Download CSV" onAction={downloadStandings} />
        <ReportCard icon={Flag} title="Printable Summary" disabled={!hasPrediction}
          desc="Opens a clean, print-ready one-pager in a new tab — great for a paddock notebook."
          actionLabel="Open & Print" onAction={doPrint} />
        <ReportCard icon={ArrowLeftRight} title="Shareable Text Summary" disabled={!hasPrediction}
          desc="Copies a short plain-text summary to your clipboard — paste into chat, notes, anywhere."
          actionLabel={copied ? "Copied!" : "Copy to Clipboard"} onAction={doCopy} />
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="px-4 sm:px-8 py-5 border-t flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" style={{ borderColor: C.border }}>
      <div className="flex flex-wrap gap-2">
        {["FastF1", "OpenF1", "Jolpica API", "HF: tracinginsights/RaceData", "Recharts"].map((s) => (
          <span key={s} className="f1-mono fs-10 px-2 py-1 rounded uppercase tracking-wide font-semibold" style={{ background: C.surfaceAlt, color: C.sub, border: `1px solid ${C.border}` }}>{s}</span>
        ))}
      </div>
      <div className="flex items-center gap-1.5 fs-11" style={{ color: C.muted }}>
        <AlertTriangle size={12} />
        Illustrative mock data — not a real prediction. Connect a live model to replace computeField/computePace/circuitHistory.
      </div>
    </footer>
  );
}

// ===========================================================================
// LANDING PAGE — F1 Predict-style product homepage (dark, data-rich),
// gating entry to the actual dashboard app.
// ===========================================================================
function LandingPage({ onEnter, theme, onToggleTheme }) {
  const LC = { bg: "#050608", panel: "#0D0F14", panelAlt: "#12151C", border: "rgba(255,255,255,0.09)", text: "#F1F2F5", sub: "rgba(255,255,255,0.6)", muted: "rgba(255,255,255,0.4)", red: "#E10600", green: "#2ECC8F" };

  const nextRace = CALENDAR.find((r) => r.status === "upcoming") || CALENDAR[0];
  const winField = useMemo(() => computeField("winner", "landing-preview", "dry"), []);
  const podiumTop3 = winField.slice(0, 3);
  const driversPreview = useMemo(() => driversStandings().slice(0, 5), []);
  const teamsForm = useMemo(() => TEAMS.map((t) => {
    const avg = t.drivers.reduce((s, d) => s + d.strength, 0) / t.drivers.length;
    const form = [0, 1, 2, 3, 4].map((i) => (seededRandom(t.id + "form" + i) * 100 < avg ? "W" : "L"));
    return { ...t, avg, form };
  }).sort((a, b) => b.avg - a.avg).slice(0, 5), []);

  const [countdown, setCountdown] = useState(378936); // illustrative — ~4d 5h, ticks down
  useEffect(() => { const id = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000); return () => clearInterval(id); }, []);
  const cd = { d: Math.floor(countdown / 86400), h: Math.floor((countdown % 86400) / 3600), m: Math.floor((countdown % 3600) / 60), s: countdown % 60 };

  const trackAxes = nextRace ? [
    { axis: "Top Speed", value: Math.round(3 + (nextRace.lengthKm / 7) * 7) },
    { axis: "Downforce", value: Math.round(10 - (nextRace.lengthKm / 7) * 4) },
    { axis: "Tyre Wear", value: nextRace.overtaking === "High" ? 8 : nextRace.overtaking === "Medium" ? 6 : 5 },
    { axis: "Overtaking", value: nextRace.overtaking === "High" ? 9 : nextRace.overtaking === "Medium" ? 6 : 3 },
    { axis: "Braking", value: Math.round(4 + (nextRace.drs || 2)) },
  ] : [];

  const featuredDrivers = ["ANT", "HAM", "RUS", "LEC", "NOR", "VER"].map((c) => FLAT_DRIVERS.find((d) => d.code === c)).filter(Boolean);

  return (
    <div className="min-h-screen w-full" style={{ background: LC.bg, color: LC.text, fontFamily: "'Inter',ui-sans-serif,system-ui" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Titillium+Web:wght@400;600;700;900&family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap');
        .f1-display { font-family: 'Titillium Web', sans-serif; }
        .f1-mono { font-family: 'IBM Plex Mono', monospace; }
        .fs-9{font-size:9px;} .fs-10{font-size:10px;} .fs-11{font-size:11px;}
        @keyframes seqL1{0%,100%{background:#3a0a0a;box-shadow:none;}2%{background:#3a0a0a;box-shadow:none;}4%{background:#ff1e1e;box-shadow:0 0 16px 4px rgba(255,30,30,.85);}88%{background:#ff1e1e;box-shadow:0 0 16px 4px rgba(255,30,30,.85);}90%{background:#3a0a0a;box-shadow:none;}}
        @keyframes seqL2{0%,100%{background:#3a0a0a;box-shadow:none;}14%{background:#3a0a0a;box-shadow:none;}16%{background:#ff1e1e;box-shadow:0 0 16px 4px rgba(255,30,30,.85);}88%{background:#ff1e1e;box-shadow:0 0 16px 4px rgba(255,30,30,.85);}90%{background:#3a0a0a;box-shadow:none;}}
        @keyframes seqL3{0%,100%{background:#3a0a0a;box-shadow:none;}26%{background:#3a0a0a;box-shadow:none;}28%{background:#ff1e1e;box-shadow:0 0 16px 4px rgba(255,30,30,.85);}88%{background:#ff1e1e;box-shadow:0 0 16px 4px rgba(255,30,30,.85);}90%{background:#3a0a0a;box-shadow:none;}}
        @keyframes seqL4{0%,100%{background:#3a0a0a;box-shadow:none;}38%{background:#3a0a0a;box-shadow:none;}40%{background:#ff1e1e;box-shadow:0 0 16px 4px rgba(255,30,30,.85);}88%{background:#ff1e1e;box-shadow:0 0 16px 4px rgba(255,30,30,.85);}90%{background:#3a0a0a;box-shadow:none;}}
        @keyframes seqL5{0%,100%{background:#3a0a0a;box-shadow:none;}50%{background:#ff1e1e;box-shadow:0 0 16px 4px rgba(255,30,30,.85);}88%{background:#ff1e1e;box-shadow:0 0 16px 4px rgba(255,30,30,.85);}90%{background:#3a0a0a;box-shadow:none;}}
        .seq-l1{animation:seqL1 5s infinite;} .seq-l2{animation:seqL2 5s infinite;} .seq-l3{animation:seqL3 5s infinite;}
        .seq-l4{animation:seqL4 5s infinite;} .seq-l5{animation:seqL5 5s infinite;}
        @keyframes streak{0%{transform:translateX(-30%);opacity:0;}10%{opacity:1;}90%{opacity:1;}100%{transform:translateX(130vw);opacity:0;}}
        .lp-streak{position:absolute;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.5),transparent);animation:streak 4.5s linear infinite;}
        .lp-grid3{display:grid;grid-template-columns:1fr;gap:14px;}
        @media(min-width:1024px){.lp-grid3{grid-template-columns:1fr 1.3fr 1fr;}}
        .lp-grid2{display:grid;grid-template-columns:1fr;gap:14px;}
        @media(min-width:1024px){.lp-grid2{grid-template-columns:1fr 1fr;}}
        .lp-hero-grid{display:grid;grid-template-columns:1fr;gap:32px;}
        @media(min-width:1024px){.lp-hero-grid{grid-template-columns:1.6fr 1fr;}}
        .lp-stats{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;}
        @media(min-width:768px){.lp-stats{grid-template-columns:repeat(5,1fr);}}
        .lp-livery{display:grid;grid-template-columns:repeat(2,1fr);}
        @media(min-width:640px){.lp-livery{grid-template-columns:repeat(3,1fr);}}
        @media(min-width:1024px){.lp-livery{grid-template-columns:repeat(6,1fr);}}
        .lp-nav-link{color:rgba(255,255,255,0.6);font-size:13px;font-weight:500;}
        .lp-nav-link.active{color:#E10600;border-bottom:2px solid #E10600;padding-bottom:4px;}
      `}</style>

      {/* NAV */}
      <header className="sticky top-0 z-10 flex items-center justify-between gap-4 px-5 sm:px-8 py-4" style={{ background: "rgba(5,6,8,0.92)", backdropFilter: "blur(6px)", borderBottom: `1px solid ${LC.border}` }}>
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <span className="w-8 h-8 flex items-center justify-center f1-display font-black text-white" style={{ background: LC.red, clipPath: "polygon(15% 0,100% 0,85% 100%,0 100%)" }}>F1</span>
          <div className="leading-none">
            <div className="f1-display font-black text-sm text-white">F1 PREDICT</div>
            <div className="fs-9 uppercase tracking-widest" style={{ color: LC.muted }}>Data. Insight. Victory.</div>
          </div>
        </div>
        <nav className="hidden lg:flex items-center gap-6">
          {["Home", "Predictions", "Races", "Drivers", "Teams", "Stats", "Analytics", "Standings"].map((n, i) => (
            <button key={n} onClick={onEnter} className={`lp-nav-link ${i === 0 ? "active" : ""}`}>{n}</button>
          ))}
        </nav>
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <button onClick={onToggleTheme} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: LC.panelAlt, border: `1px solid ${LC.border}` }} title="Toggle theme">
            {theme === "dark" ? <Sun size={13} color={LC.sub} /> : <Moon size={13} color={LC.sub} />}
          </button>
          <button onClick={onEnter} className="f1-mono text-xs font-bold uppercase tracking-widest px-4 py-2 text-white rounded" style={{ background: LC.red }}>
            Enter App
          </button>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden" style={{ minHeight: 580 }}>
        {/* HERO IMAGE SLOT — fills the entire section; drop a real F1 photo/video-still here */}
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${LC.panel}, #050608 70%)` }}>
          <div className="absolute inset-3 sm:inset-5 rounded-xl flex items-center justify-center" style={{ border: `2px dashed ${LC.border}` }}>
            <div className="text-center px-4">
              <ImageIcon size={30} color={LC.muted} className="mx-auto mb-3" />
              <div className="fs-11 uppercase tracking-widest font-bold" style={{ color: LC.muted }}>🏎️ Hero image slot</div>
              <div className="fs-10 mt-1 max-w-xs mx-auto" style={{ color: LC.muted }}>Full-bleed F1 car / track-action photo goes here — text overlays with a dark gradient, same as the reference.</div>
            </div>
          </div>
        </div>
        {/* Gradient overlay so hero text stays legible once a real photo is dropped in */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(100deg, rgba(5,6,8,0.97) 32%, rgba(5,6,8,0.55) 60%, rgba(5,6,8,0.88) 100%)" }} />

        <div className="relative z-10 px-5 sm:px-8 pt-14 pb-14 lp-hero-grid">
          <div>
            <div className="f1-mono fs-11 uppercase tracking-widest font-bold mb-4" style={{ color: LC.red }}>AI-Powered Formula 1 Predictions</div>
            <h1 className="f1-display font-black uppercase mb-5" style={{ fontSize: "clamp(2.6rem,7.5vw,5.2rem)", lineHeight: 0.92, letterSpacing: "-0.01em" }}>
              Predict.<br />Analyze.<br /><span style={{ color: LC.red }}>Win.</span>
            </h1>
            <p className="text-base sm:text-lg max-w-lg mb-7" style={{ color: LC.sub }}>
              A tunable prediction model, live championship data, and the full 2026 calendar —
              make smarter calls and stay ahead all season.
            </p>
            <div className="flex flex-wrap gap-3 mb-10">
              <button onClick={onEnter} className="f1-mono text-sm font-bold uppercase tracking-widest px-6 py-3.5 text-white flex items-center gap-2 rounded shadow-lg" style={{ background: LC.red }}>
                Make a Prediction <ArrowLeftRight size={14} />
              </button>
              <button onClick={onEnter} className="f1-mono text-sm font-bold uppercase tracking-widest px-6 py-3.5 rounded" style={{ border: `1px solid ${LC.border}`, color: LC.text, background: "rgba(13,15,20,0.5)" }}>
                Explore Analytics
              </button>
            </div>

            {/* Starting lights, kept as a signature motif */}
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5 p-1.5 rounded-sm" style={{ background: "#161616" }}>
                {["seq-l1", "seq-l2", "seq-l3", "seq-l4", "seq-l5"].map((cls) => (
                  <span key={cls} className={`w-3 h-3 rounded-full ${cls}`} style={{ background: "#3a0a0a" }} />
                ))}
              </div>
              <span className="f1-mono fs-10 uppercase tracking-widest font-bold" style={{ color: LC.muted }}>Lights out, and away we go</span>
            </div>
          </div>

          {/* NEXT RACE floating card — semi-transparent so it reads over a real photo */}
          <div className="rounded-xl p-5 h-fit shadow-2xl" style={{ background: "rgba(13,15,20,0.88)", backdropFilter: "blur(8px)", border: `1px solid ${LC.border}` }}>
            <div className="fs-10 uppercase tracking-widest font-bold mb-2" style={{ color: LC.muted }}>Next Race</div>
            {nextRace && (
              <>
                <div className="f1-display font-black text-xl uppercase leading-tight">{nextRace.name}</div>
                <div className="text-sm mb-4 flex items-center gap-1.5" style={{ color: LC.sub }}>{nextRace.flag} {nextRace.location}</div>
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[["d", "Days"], ["h", "Hrs"], ["m", "Mins"], ["s", "Secs"]].map(([k, label]) => (
                    <div key={k} className="rounded-lg py-2 text-center" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div className="f1-mono text-xl font-bold" style={{ color: LC.red }}>{String(cd[k]).padStart(2, "0")}</div>
                      <div className="fs-9 uppercase tracking-widest" style={{ color: LC.muted }}>{label}</div>
                    </div>
                  ))}
                </div>
                <button onClick={onEnter} className="w-full text-xs font-bold uppercase tracking-wide px-4 py-2.5 rounded" style={{ border: `1px solid ${LC.border}`, color: LC.text }}>
                  View Race Details
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* STATS BAR — honest figures, not inflated */}
      <section className="px-5 sm:px-8 py-6" style={{ borderTop: `1px solid ${LC.border}`, borderBottom: `1px solid ${LC.border}` }}>
        <div className="lp-stats">
          {[
            { icon: Trophy, value: "23", label: "Real 2026 Rounds" },
            { icon: SlidersHorizontal, value: "5", label: "Tunable Model Params" },
            { icon: Database, value: "Live", label: "Jolpica API Standings" },
            { icon: Gauge, value: "89%", label: "Podium-Call Accuracy*" },
            { icon: BarChart3, value: "40+", label: "Charts Across the App" },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="flex items-center gap-3 px-0 sm:px-4" style={{ borderLeft: i === 0 ? "none" : `1px solid ${LC.border}` }}>
                <span className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(225,6,0,0.12)" }}><Icon size={16} color={LC.red} /></span>
                <div>
                  <div className="f1-display font-black text-lg leading-none">{s.value}</div>
                  <div className="fs-10" style={{ color: LC.muted }}>{s.label}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="fs-9 mt-3" style={{ color: LC.muted }}>*Backtested podium-classification accuracy vs. random baseline — see Analytics for the full breakdown by target.</div>
      </section>

      {/* ROW 1: Upcoming race / AI winner preview / standings preview */}
      <section className="px-5 sm:px-8 py-8">
        <div className="lp-grid3">
          <div className="rounded-xl p-4 shadow-lg" style={{ background: LC.panel, border: `1px solid ${LC.border}` }}>
            <div className="fs-10 uppercase tracking-widest font-bold mb-3" style={{ color: LC.muted }}>Upcoming Race</div>
            <div className="rounded-lg mb-3 flex items-center justify-center" style={{ height: 110, background: LC.panelAlt, border: `1.5px dashed ${LC.border}` }}>
              <MapPin size={20} color={LC.muted} />
            </div>
            {nextRace && (
              <>
                <div className="f1-display font-bold text-lg">{nextRace.name}</div>
                <div className="text-sm mb-3" style={{ color: LC.sub }}>{nextRace.circuit}</div>
                <div className="space-y-1.5 text-sm mb-3">
                  <div className="flex justify-between"><span style={{ color: LC.muted }}>Round</span><span className="f1-mono font-semibold">{nextRace.round} / 23</span></div>
                  <div className="flex justify-between"><span style={{ color: LC.muted }}>Date</span><span className="f1-mono font-semibold">{nextRace.date}</span></div>
                  <div className="flex justify-between"><span style={{ color: LC.muted }}>Circuit Length</span><span className="f1-mono font-semibold">{nextRace.lengthKm.toFixed(3)} km</span></div>
                  <div className="flex justify-between"><span style={{ color: LC.muted }}>Laps</span><span className="f1-mono font-semibold">{nextRace.laps}</span></div>
                </div>
              </>
            )}
            <button onClick={onEnter} className="w-full text-xs font-bold uppercase tracking-wide px-4 py-2.5 rounded" style={{ border: `1px solid ${LC.border}` }}>View Circuit Guide</button>
          </div>

          <div className="rounded-xl p-4 shadow-lg" style={{ background: LC.panel, border: `1px solid ${LC.border}` }}>
            <div className="flex items-center justify-between mb-3">
              <div className="fs-10 uppercase tracking-widest font-bold" style={{ color: LC.muted }}>AI Race Winner Prediction</div>
              <button onClick={onEnter} className="fs-10 font-semibold flex items-center gap-1" style={{ color: LC.sub }}>How it works <ArrowLeftRight size={10} /></button>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[podiumTop3[1], podiumTop3[0], podiumTop3[2]].map((d, idx) => {
                const isLead = idx === 1;
                return (
                  <div key={d.code} className="rounded-lg p-2.5 text-center relative" style={{ background: isLead ? "rgba(225,6,0,0.1)" : LC.panelAlt, border: `1px solid ${isLead ? LC.red : LC.border}` }}>
                    <div className="fs-9 f1-mono font-bold mb-1" style={{ color: LC.muted }}>P{idx === 1 ? 1 : idx === 0 ? 2 : 3}</div>
                    <div className="rounded-md mb-2 mx-auto flex items-center justify-center" style={{ width: "70%", aspectRatio: "1", background: LC.panelAlt, border: `1.5px dashed ${LC.border}` }}>
                      <ImageIcon size={16} color={LC.muted} />
                    </div>
                    <div className="f1-display font-bold text-xs truncate">{d.name}</div>
                    <div className="fs-9 truncate mb-1.5" style={{ color: d.color }}>{d.teamName}</div>
                    <div className="f1-mono font-black" style={{ fontSize: isLead ? 20 : 16, color: isLead ? LC.red : LC.text }}>{(d.prob * 100).toFixed(0)}%</div>
                    <div className="fs-9" style={{ color: LC.muted }}>Win Probability</div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="fs-10 flex-shrink-0" style={{ color: LC.muted }}>Other Drivers</span>
              <span className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: LC.panelAlt }}>
                <span className="block h-full rounded-full" style={{ width: `${Math.max(5, (1 - podiumTop3.reduce((a, d) => a + d.prob, 0)) * 100)}%`, background: "#9D4EDD" }} />
              </span>
              <span className="fs-10 f1-mono font-semibold flex-shrink-0">{Math.max(0, (1 - podiumTop3.reduce((a, d) => a + d.prob, 0)) * 100).toFixed(0)}%</span>
            </div>
            <div className="flex items-center gap-1.5 fs-10" style={{ color: LC.green }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: LC.green }} /> Illustrative model — tune it yourself inside
            </div>
            <div className="fs-9 mt-1.5" style={{ color: LC.muted }}>Based on recalibrated 2026 form, grid position, weather & reliability.</div>
          </div>

          <div className="rounded-xl p-4 shadow-lg" style={{ background: LC.panel, border: `1px solid ${LC.border}` }}>
            <div className="fs-10 uppercase tracking-widest font-bold mb-3" style={{ color: LC.muted }}>Championship Standings</div>
            <div className="flex gap-1.5 p-1 rounded-lg mb-3 w-fit" style={{ background: LC.panelAlt }}>
              <span className="fs-10 font-bold uppercase px-2.5 py-1 rounded" style={{ background: LC.red, color: "#fff" }}>Drivers</span>
              <span className="fs-10 font-bold uppercase px-2.5 py-1 rounded" style={{ color: LC.muted }}>Constructors</span>
            </div>
            <div className="space-y-2 mb-3">
              {driversPreview.map((d, i) => (
                <div key={d.code} className="flex items-center gap-2 text-sm">
                  <span className="f1-mono font-bold w-4" style={{ color: LC.muted }}>{i + 1}</span>
                  <span className="w-2 h-5 rounded-sm flex-shrink-0" style={{ background: d.color }} />
                  <span className="flex-1 truncate font-semibold">{d.name}</span>
                  <span className="f1-mono fs-11 font-bold" style={{ color: LC.sub }}>{d.points} pts</span>
                </div>
              ))}
            </div>
            <button onClick={onEnter} className="w-full text-xs font-bold uppercase tracking-wide px-4 py-2.5 rounded" style={{ border: `1px solid ${LC.border}` }}>Full Standings</button>
          </div>
        </div>
      </section>

      {/* ROW 2: Team form / Track insights / Weather */}
      <section className="px-5 sm:px-8 pb-8">
        <div className="lp-grid3">
          <div className="rounded-xl p-4 shadow-lg" style={{ background: LC.panel, border: `1px solid ${LC.border}` }}>
            <div className="fs-10 uppercase tracking-widest font-bold mb-3" style={{ color: LC.muted }}>Team Form <span style={{ color: LC.muted, fontWeight: 400 }}>(illustrative)</span></div>
            <div className="space-y-2.5 mb-3">
              {teamsForm.map((t) => (
                <div key={t.id} className="flex items-center gap-2">
                  <span className="w-2 h-5 rounded-sm flex-shrink-0" style={{ background: t.color }} />
                  <span className="flex-1 text-sm font-semibold truncate">{t.name}</span>
                  <span className="flex gap-1">
                    {t.form.map((r, i) => (
                      <span key={i} className="w-5 h-5 rounded-full flex items-center justify-center fs-9 font-black" style={{ background: r === "W" ? LC.green : "#E5484D", color: "#0A0C10" }}>{r}</span>
                    ))}
                  </span>
                </div>
              ))}
            </div>
            <button onClick={onEnter} className="w-full text-xs font-bold uppercase tracking-wide px-4 py-2.5 rounded" style={{ border: `1px solid ${LC.border}` }}>View All Teams</button>
          </div>

          <div className="rounded-xl p-4 shadow-lg" style={{ background: LC.panel, border: `1px solid ${LC.border}` }}>
            <div className="fs-10 uppercase tracking-widest font-bold mb-2" style={{ color: LC.muted }}>Track Insights — {nextRace?.name}</div>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={trackAxes} outerRadius="72%">
                <PolarGrid stroke="rgba(255,255,255,0.12)" />
                <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10, fill: LC.sub }} />
                <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fontSize: 8, fill: LC.muted }} />
                <Radar dataKey="value" stroke={LC.red} fill={LC.red} fillOpacity={0.35} />
              </RadarChart>
            </ResponsiveContainer>
            <div className="fs-10 text-center mt-1" style={{ color: LC.muted }}>{nextRace?.overtaking} overtaking difficulty · {nextRace?.drs} DRS zones</div>
          </div>

          <div className="rounded-xl p-4 shadow-lg" style={{ background: LC.panel, border: `1px solid ${LC.border}` }}>
            <div className="fs-10 uppercase tracking-widest font-bold mb-3" style={{ color: LC.muted }}>Weather Forecast</div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CloudSun size={26} color="#F5B942" />
                <div>
                  <div className="f1-display font-black text-lg">{nextRace?.baseTemp}°C</div>
                  <div className="fs-10" style={{ color: LC.sub }}>Partly Cloudy</div>
                </div>
              </div>
              <div className="text-right fs-10" style={{ color: LC.sub }}>
                <div>Chance of Rain <b className="f1-mono">{nextRace?.baseRain}%</b></div>
                <div>Humidity <b className="f1-mono">58%</b></div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {["FRI", "SAT", "SUN"].map((d, i) => (
                <div key={d} className="rounded-lg p-2 text-center" style={{ background: LC.panelAlt }}>
                  <div className="fs-9 font-bold" style={{ color: LC.muted }}>{d}</div>
                  <Sun size={14} color="#F5B942" className="mx-auto my-1" />
                  <div className="f1-mono fs-11 font-bold">{(nextRace?.baseTemp || 22) - 1 + i}°C</div>
                </div>
              ))}
            </div>
            <button onClick={onEnter} className="w-full text-xs font-bold uppercase tracking-wide px-4 py-2.5 rounded" style={{ border: `1px solid ${LC.border}` }}>Full Forecast</button>
          </div>
        </div>
      </section>

      {/* ROW 3: Featured analysis / How scoring works (relabeled, honest — no fake user activity) */}
      <section className="px-5 sm:px-8 pb-8">
        <div className="lp-grid2">
          <div className="rounded-xl overflow-hidden shadow-lg" style={{ background: LC.panel, border: `1px solid ${LC.border}` }}>
            <div className="grid grid-cols-1 sm:grid-cols-2">
              <div className="p-5">
                <div className="fs-10 uppercase tracking-widest font-bold mb-2" style={{ color: LC.red }}>Featured Analysis</div>
                <div className="f1-display font-black text-xl mb-2">Why {nextRace?.name?.split(" ")[0] || "This Circuit"} Rewards {nextRace?.overtaking === "Low" ? "Qualifying" : "Race Pace"}</div>
                <p className="text-sm mb-4" style={{ color: LC.sub }}>
                  {nextRace?.overtaking === "Low"
                    ? `${nextRace.circuit} is one of the calendar's hardest circuits to pass on — track position won on Saturday tends to hold all Sunday.`
                    : `${nextRace?.circuit} rewards a strong power unit and clean stint management, with real overtaking chances into the braking zones.`}
                </p>
                <button onClick={onEnter} className="text-xs font-bold uppercase tracking-wide px-4 py-2.5 rounded text-white" style={{ background: LC.red }}>Read Full Analysis</button>
              </div>
              <div className="flex items-center justify-center" style={{ background: LC.panelAlt, border: `1.5px dashed ${LC.border}`, minHeight: 160 }}>
                <ImageIcon size={22} color={LC.muted} />
              </div>
            </div>
          </div>

          <div className="rounded-xl p-4 shadow-lg" style={{ background: LC.panel, border: `1px solid ${LC.border}` }}>
            <div className="flex items-center justify-between mb-3">
              <div className="fs-10 uppercase tracking-widest font-bold" style={{ color: LC.muted }}>How Fantasy Scoring Works</div>
              <button onClick={onEnter} className="fs-10 font-semibold" style={{ color: LC.sub }}>View all →</button>
            </div>
            <div className="space-y-2.5">
              {[
                { label: "Race win prediction", pts: "+25 pts", ok: true },
                { label: "Podium prediction", pts: "+15 pts", ok: true },
                { label: "Points-finish prediction", pts: "+8 pts", ok: true },
                { label: "Missed prediction", pts: "0 pts", ok: false },
              ].map((row, i) => (
                <div key={i} className="flex items-center gap-2.5 text-sm">
                  <span className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: LC.panelAlt }}><Trophy size={12} color={LC.muted} /></span>
                  <span className="flex-1" style={{ color: LC.sub }}>{row.label}</span>
                  <span className="fs-10 font-bold px-2 py-0.5 rounded" style={{ background: row.ok ? "rgba(46,204,143,0.15)" : "rgba(229,72,77,0.15)", color: row.ok ? LC.green : "#E5484D" }}>{row.ok ? "Correct" : "Incorrect"}</span>
                  <span className="f1-mono fs-11 font-bold w-12 text-right">{row.pts}</span>
                </div>
              ))}
            </div>
            <div className="fs-9 mt-3" style={{ color: LC.muted }}>Illustrative scoring model — an approximation of real F1 Fantasy rules, built for fantasy-league players.</div>
          </div>
        </div>
      </section>

      {/* CTA banner — honest copy, no fabricated user-base claims */}
      <section className="px-5 sm:px-8 pb-8">
        <div className="rounded-xl p-6 sm:p-8 relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-5"
          style={{ background: "linear-gradient(120deg,#1A0505,#0D0F14)", border: `1px solid ${LC.border}` }}>
          <div>
            <div className="f1-mono fs-11 uppercase tracking-widest font-bold mb-2" style={{ color: LC.red }}>Built for the 2026 season</div>
            <div className="f1-display font-black text-2xl mb-1">Predict. Tune. Compare.</div>
            <p className="text-sm max-w-md" style={{ color: LC.sub }}>Every session, every target, the full grid — powered by a model you can actually adjust.</p>
          </div>
          <button onClick={onEnter} className="f1-mono text-sm font-bold uppercase tracking-widest px-7 py-3.5 text-white rounded flex items-center gap-2 flex-shrink-0" style={{ background: LC.red }}>
            Enter Predictor <ArrowLeftRight size={14} />
          </button>
        </div>
      </section>

      {/* FOOTER — real, honest links (no fake app-store badges) */}
      <footer className="px-5 sm:px-8 pt-10 pb-8" style={{ borderTop: `1px solid ${LC.border}` }}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-8">
          <div className="col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-7 h-7 flex items-center justify-center f1-display font-black text-white text-xs" style={{ background: LC.red, clipPath: "polygon(15% 0,100% 0,85% 100%,0 100%)" }}>F1</span>
              <span className="f1-display font-black text-sm">F1 PREDICT</span>
            </div>
            <p className="fs-11" style={{ color: LC.muted }}>A tunable, live-data 2026 prediction platform — built for fantasy-league players.</p>
          </div>
          {[
            { title: "Product", items: ["Dashboard", "Standings", "H2H Comparison", "Constructors", "Analytics & Settings"] },
            { title: "Resources", items: ["Jolpica API", "Recharts", "How Grid Auto-fill Works", "Fantasy Scoring Guide"] },
            { title: "About", items: ["Illustrative Model Notice", "Data Sources", "Accuracy by Target"] },
          ].map((col) => (
            <div key={col.title}>
              <div className="fs-10 uppercase tracking-widest font-bold mb-3" style={{ color: LC.muted }}>{col.title}</div>
              <div className="space-y-2">
                {col.items.map((it) => (
                  <button key={it} onClick={onEnter} className="block fs-11 text-left" style={{ color: LC.sub }}>{it}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 pt-5" style={{ borderTop: `1px solid ${LC.border}` }}>
          <span className="fs-10" style={{ color: LC.muted }}>Illustrative mock data — not a real prediction service. © 2026 F1 Predict.</span>
          <button onClick={onEnter} className="f1-mono fs-10 font-bold uppercase tracking-widest px-3 py-1.5 rounded text-white" style={{ background: LC.red }}>Enter Predictor</button>
        </div>
      </footer>
    </div>
  );
}

// ===========================================================================
// APP
// ===========================================================================
export default function F1PredictorDashboard() {
  const [view, setView] = useState("landing");
  const [tab, setTab] = useState("dashboard");
  const [theme, setTheme] = useState("light");
  setGlobalTheme(theme); // synchronous, before any child renders — see C Proxy above
  const [tick, setTick] = useState(0);
  const [countdown, setCountdown] = useState(96540); // ~26h48m, illustrative "next session in"
  const [settings, setSettings] = useState({
    defaultSession: "race", defaultWeather: "dry", defaultSimCount: 10000,
    compactRows: false, reducedMotion: false,
    chaosLevel: 50, wetInfluence: 50, reliabilityInfluence: 50, strategyAggressiveness: 50, gridWeight: 55,
    seasonYear: 2026, forceSimulated: false,
    apiSources: { fastf1: true, openf1: true, jolpica: true, huggingface: true, recharts: true },
    units: "metric",
  });
  setGlobalApiConfig({ season: settings.seasonYear, forceSimulated: settings.forceSimulated });

  const [draft, setDraft] = useState({ raceId: "", weather: settings.defaultWeather, simCount: settings.defaultSimCount });
  const [session, setSession] = useState(settings.defaultSession);
  const [subSession, setSubSession] = useState(SESSIONS.find((s) => s.id === settings.defaultSession).sub[0]);
  const [targetId, setTargetId] = useState("podium");
  const [runState, setRunState] = useState("idle"); // idle | running | done
  const [committed, setCommitted] = useState(null);

  useEffect(() => {
    const id = setInterval(() => {
      setTick((t) => t + 1);
      setCountdown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (runState !== "running") return;
    const t = setTimeout(() => setRunState("done"), 900);
    return () => clearTimeout(t);
  }, [runState]);

  useEffect(() => {
    const valid = TARGETS.filter((t) => t.session === session);
    if (session !== "practice" && !valid.find((t) => t.id === targetId)) {
      setTargetId(valid[0]?.id || "q3");
    }
  }, [session]); // eslint-disable-line

  const draftRace = CALENDAR.find((r) => r.id === draft.raceId);
  const race = CALENDAR.find((r) => r.id === committed?.raceId);

  // --- Grid auto-fill: qualifying position is one of the strongest real
  // predictors of race outcome (~43% historical pole-to-win rate, higher in
  // recent seasons). For completed races we use the REAL grid; otherwise we
  // simulate Q3 first and use that as the grid, so Sunday's prediction is
  // always informed by a Saturday result rather than computed in isolation.
  // If the user doesn't trust either, they can enter the P1-P22 grid by hand.
  const [manualGrid, setManualGrid] = useState(null);
  const [showManualGrid, setShowManualGrid] = useState(false);
  useEffect(() => { setManualGrid(null); setShowManualGrid(false); }, [committed?.raceId]);

  const liveQuali = useQualifyingResult(race?.status === "completed" ? race.round : null);
  const simulatedGrid = useMemo(() => {
    if (!committed || session !== "race") return null;
    const q = computeField("q3", committed.raceId, committed.weather, settings.chaosLevel, settings.wetInfluence, settings.reliabilityInfluence);
    const g = {};
    q.forEach((d, i) => { g[d.code] = i + 1; });
    return g;
  }, [committed, session, settings.chaosLevel, settings.wetInfluence, settings.reliabilityInfluence]);
  const gridSource = manualGrid ? "manual" : liveQuali.status === "success" ? "live" : simulatedGrid ? "simulated" : null;
  const gridPositions = manualGrid || (liveQuali.status === "success" ? liveQuali.grid : simulatedGrid);

  const field = useMemo(() => (committed ? computeField(targetId, committed.raceId, committed.weather, settings.chaosLevel, settings.wetInfluence, settings.reliabilityInfluence, gridPositions, settings.gridWeight) : []), [committed, targetId, settings.chaosLevel, settings.wetInfluence, settings.reliabilityInfluence, gridPositions, settings.gridWeight]);
  const pace = useMemo(() => (committed ? computePace(committed.raceId, committed.weather, committed.subSession, settings.wetInfluence) : []), [committed, settings.wetInfluence]);
  const confidence = committed ? Math.min(96, Math.round(40 + Math.log10(committed.simCount) * 13)) : null;

  const targetsForSession = TARGETS.filter((t) => t.session === session);
  const activeTarget = targetsForSession.find((t) => t.id === targetId) || targetsForSession[0];

  function handleRun() {
    if (!draft.raceId) return;
    setCommitted({ ...draft, session, subSession });
    setRunState("running");
  }

  if (view === "landing") {
    return <LandingPage onEnter={() => setView("app")} theme={theme} onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))} />;
  }

  return (
    <div className="min-h-screen w-full" style={{ background: C.bg, color: C.text, fontFamily: "'Inter',ui-sans-serif,system-ui" }}>
      <GlobalStyle />
      <NavBar tab={tab} setTab={setTab} tick={tick}
        theme={theme} onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))} onGoHome={() => setView("landing")} />

      {tab === "dashboard" && (
        <>
          <Hero draft={draft} setDraft={setDraft} confidence={confidence} session={session} countdown={countdown} />
          <RealResultBanner race={draftRace} />
          <CircuitHistorySection race={draftRace} />
          <SessionCards session={session} setSession={setSession} setSubSession={setSubSession} race={draftRace} />
          <ControlBar draft={draft} setDraft={setDraft} session={session} subSession={subSession} setSubSession={setSubSession}
            onRun={handleRun} running={runState === "running"} raceSelected={!!draft.raceId} race={draftRace} />
          <InfoCards race={race} session={session} subSession={subSession} weather={committed?.weather || draft.weather} runState={runState} />

          <section className="px-4 sm:px-8 pb-4">
            {runState !== "done" ? (
              <div className="rounded-xl shadow-sm" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                <EmptyState icon={Zap} title={draft.raceId ? "Ready to run" : "Select a Grand Prix"}
                  body={draft.raceId ? "Click Run Prediction to generate the projection." : "Circuit, session and weather all feed the prediction engine."} />
              </div>
            ) : (
              <>
                {session === "race" && (
                  <>
                    {gridSource ? (
                      <div className="flex flex-wrap items-center gap-2 mb-3 fs-11 font-semibold px-3 py-2 rounded-lg"
                        style={{ background: gridSource === "live" ? C.redTint : C.surfaceAlt, color: gridSource === "live" ? C.green : C.sub, border: `1px solid ${C.border}` }}>
                        {gridSource === "live" ? <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: C.green }} /> : <SlidersHorizontal size={12} className="flex-shrink-0" />}
                        <span>
                          Grid auto-filled from {gridSource === "live" ? "real qualifying results (Jolpica API)" : gridSource === "manual" ? "your manual entry" : "simulated Q1-Q3"} — qualifying position is one of the strongest real predictors of race outcome.
                        </span>
                        <button onClick={() => setShowManualGrid((v) => !v)} className="fs-10 font-bold uppercase tracking-wide px-2 py-1 rounded flex-shrink-0" style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text }}>
                          {showManualGrid ? "Hide Manual Entry" : "Edit Grid Manually"}
                        </button>
                        {gridSource === "manual" && (
                          <button onClick={() => setManualGrid(null)} className="fs-10 font-bold uppercase tracking-wide px-2 py-1 rounded flex-shrink-0" style={{ color: C.red }}>Revert to Auto-fill</button>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2 mb-3 fs-11 font-semibold px-3 py-2 rounded-lg" style={{ background: C.redTint, color: C.red, border: `1px solid ${C.border}` }}>
                        <AlertTriangle size={12} className="flex-shrink-0" />
                        <span>Couldn't auto-fill the grid for this race — please assign each driver's starting position (P1-P22) manually below.</span>
                      </div>
                    )}
                    {(showManualGrid || !gridSource) && (
                      <ManualGridEditor value={manualGrid} seedGrid={liveQuali.status === "success" ? liveQuali.grid : simulatedGrid}
                        onApply={(g) => { setManualGrid(g); setShowManualGrid(false); }}
                        onCancel={() => setShowManualGrid(false)} />
                    )}
                  </>
                )}
                {session !== "practice" && (
                  <div className="flex flex-wrap gap-1.5 p-1 rounded-lg mb-4 w-fit" style={{ background: C.surfaceAlt, border: `1px solid ${C.border}` }}>
                    {targetsForSession.map((t) => (
                      <button key={t.id} onClick={() => setTargetId(t.id)}
                        className="f1-mono fs-11 px-3 py-1.5 rounded-md uppercase tracking-wide font-semibold"
                        style={{ background: t.id === targetId ? C.red : "transparent", color: t.id === targetId ? "#fff" : C.sub }}>
                        {t.short}
                      </button>
                    ))}
                  </div>
                )}
                <ResultsHero session={session} target={activeTarget} field={field} pace={pace} />

                <div className={session === "practice" ? "charts-grid gap-4 mt-4" : "charts-grid-3 gap-4 mt-4"}>
                  <div className="rounded-xl p-4 shadow-sm" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                    <div className="f1-display font-bold mb-1" style={{ color: C.text }}>
                      {session === "practice" ? "Relative Pace Distribution" : `${activeTarget.label} Distribution`}
                    </div>
                    <DistributionChart session={session} target={activeTarget} field={field} pace={pace} />
                  </div>
                  <div className="rounded-xl p-4 shadow-sm" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                    <div className="f1-display font-bold mb-1" style={{ color: C.text }}>Model Confidence</div>
                    <ConfidenceGauge confidence={confidence} />
                  </div>
                  {session !== "practice" && (
                    <div className="rounded-xl p-4 shadow-sm" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                      <div className="f1-display font-bold mb-1" style={{ color: C.text }}>DNF Risk Spread</div>
                      <DnfRiskPie field={field} />
                    </div>
                  )}
                </div>

                {session === "practice" && (
                  <>
                    <div className="rounded-xl p-4 shadow-sm mt-4" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                      <div className="f1-display font-bold mb-1" style={{ color: C.text }}>Pace Evolution — FP1 → FP3</div>
                      <p className="text-xs mb-2" style={{ color: C.sub }}>Top 5 drivers' relative pace index across the three practice sessions.</p>
                      <PaceEvolutionChart raceId={committed.raceId} weather={committed.weather} />
                    </div>
                    <div className="charts-grid gap-4 mt-4">
                      <div className="rounded-xl p-4 shadow-sm" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                        <div className="f1-display font-bold mb-1" style={{ color: C.text }}>Sector Comparison</div>
                        <p className="text-xs mb-2" style={{ color: C.sub }}>Modelled sector-by-sector split for the top 6 drivers.</p>
                        <SectorComparisonChart pace={pace} />
                      </div>
                      <div className="rounded-xl p-4 shadow-sm" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                        <div className="f1-display font-bold mb-1" style={{ color: C.text }}>Long-Run Consistency</div>
                        <p className="text-xs mb-2" style={{ color: C.sub }}>Lower spread = more repeatable lap times.</p>
                        <ConsistencyChart pace={pace} />
                      </div>
                    </div>
                  </>
                )}
                {session === "qualifying" && (
                  <div className="charts-grid gap-4 mt-4">
                    <div className="rounded-xl p-4 shadow-sm" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                      <div className="f1-display font-bold mb-1" style={{ color: C.text }}>Gap to Provisional Pole</div>
                      <p className="text-xs mb-2" style={{ color: C.sub }}>Modelled time gap to the projected pole-sitter.</p>
                      <GapToPoleChart field={field} />
                    </div>
                    <div className="rounded-xl p-4 shadow-sm" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                      <div className="f1-display font-bold mb-1" style={{ color: C.text }}>Elimination Funnel</div>
                      <p className="text-xs mb-2" style={{ color: C.sub }}>Who's projected to advance through Q1 → Q2 → Q3.</p>
                      <QualifyingFunnel field={field} subSession={committed?.subSession} />
                    </div>
                  </div>
                )}
                {session === "race" && (
                  <>
                    <StrategySection race={race} weather={committed?.weather} field={field} strategyAggressiveness={settings.strategyAggressiveness} />
                    <div className="charts-grid gap-4 mt-4">
                      <div className="rounded-xl p-4 shadow-sm" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                        <div className="f1-display font-bold mb-1" style={{ color: C.text }}>Position Change</div>
                        <p className="text-xs mb-2" style={{ color: C.sub }}>Projected places gained or lost from grid to finish.</p>
                        <PositionChangeChart field={field} />
                      </div>
                      <div className="rounded-xl p-4 shadow-sm" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                        <div className="f1-display font-bold mb-1" style={{ color: C.text }}>Lap-by-Lap Gap Trend</div>
                        <p className="text-xs mb-2" style={{ color: C.sub }}>Simulated gap to the leader across the race distance, top 5.</p>
                        <LapPaceTrendChart field={field} race={race} />
                      </div>
                    </div>
                  </>
                )}

                <div className="mt-4">
                  <ResultsGrid session={session} subSession={committed?.subSession} target={activeTarget} field={field} pace={pace} compact={settings.compactRows} />
                </div>
              </>
            )}
          </section>
        </>
      )}
      {tab === "standings" && <StandingsTab />}
      {tab === "h2h" && <H2HTab />}
      {tab === "constructors" && <ConstructorsTab />}
      {tab === "analytics" && <AnalyticsSettingsTab settings={settings} setSettings={setSettings} />}
      {tab === "report" && <ReportTab session={session} race={race} field={field} pace={pace} runState={runState} />}

      <Footer />
    </div>
  );
}
