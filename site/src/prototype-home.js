// PROTOTYPE — throwaway. Variant switcher (?variant=A|B|C, ← →), Clarity's pixel
// rails (ported from clarity-board/src/app/_landing/pixel-field.tsx), and the lists.

const SAMPLE = [
  ["Send the revised quote to the Osaka team", "3d"],
  ["Book train tickets for Friday", "1d"],
  ["Reply to Sam about the workshop dates", "5h"],
  ["Renew the domain before the 20th", "12m"],
];

// ── Variant switcher ─────────────────────────────────────────
const variants = [...document.querySelectorAll(".variant")];
const keys = variants.map((v) => v.dataset.variant);
let current = new URLSearchParams(location.search).get("variant") ?? keys[0];
if (!keys.includes(current)) current = keys[0];

const bar = document.createElement("div");
bar.className = "proto-bar";
bar.innerHTML = `<button aria-label="Previous variant">←</button><span></span><button aria-label="Next variant">→</button>`;
const [prev, label, next] = bar.children;
if (import.meta.env.DEV) document.body.append(bar);

function show(key) {
  current = key;
  for (const v of variants) v.hidden = v.dataset.variant !== key;
  const v = variants.find((x) => x.dataset.variant === key);
  label.textContent = `${key} (${v.dataset.name})`;
  const url = new URL(location.href);
  url.searchParams.set("variant", key);
  history.replaceState(null, "", url);
  window.dispatchEvent(new Event("resize")); // rails measure only when visible
}
function step(by) {
  show(keys[(keys.indexOf(current) + by + keys.length) % keys.length]);
}
prev.onclick = () => step(-1);
next.onclick = () => step(1);
addEventListener("keydown", (e) => {
  if (e.target.closest("input, textarea, [contenteditable]")) return;
  if (e.key === "ArrowLeft") step(-1);
  if (e.key === "ArrowRight") step(1);
});

// ── Pixel rails ──────────────────────────────────────────────
const COLOURS = ["#7aa2f7", "#bb9af7", "#9ece6a", "#7dcfff"];
const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
const rails = [...document.querySelectorAll("canvas.rail")].map((canvas) => ({ canvas, cells: [] }));

function seed(rail) {
  const { canvas } = rail;
  const ctx = canvas.getContext("2d");
  const ratio = devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * ratio;
  canvas.height = canvas.clientHeight * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  rail.cells = [];
  for (let x = 0; x < canvas.clientWidth; x += 14) {
    const t = x / Math.max(canvas.clientWidth, 1);
    const outward = canvas.dataset.edge === "left" ? 1 - t : t;
    for (let y = 0; y < canvas.clientHeight; y += 14) {
      if (Math.random() > 0.08 + outward * 0.6) continue;
      rail.cells.push({
        x,
        y,
        level: Math.random(),
        speed: (Math.random() - 0.5) * 0.02,
        colour: COLOURS[Math.floor(Math.random() * COLOURS.length)],
      });
    }
  }
}
function draw() {
  for (const { canvas, cells } of rails) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    for (const c of cells) {
      if (!still) {
        c.level += c.speed;
        if (c.level <= 0 || c.level >= 1) c.speed = -c.speed;
      }
      ctx.globalAlpha = Math.max(0.05, Math.min(0.6, c.level * 0.6));
      ctx.fillStyle = c.colour;
      ctx.fillRect(c.x, c.y, 6, 6);
    }
  }
}
addEventListener("resize", () => {
  rails.forEach(seed);
  draw();
});
(function loop() {
  if (!still) draw();
  requestAnimationFrame(loop);
})();

// ── The Focus Zen window (A static, B live) ──────────────────
function appWindow(root, live) {
  root.innerHTML = `<div class="app-bar"><i></i><i></i><i></i><span>Focus Zen</span></div><ul></ul>`;
  const list = root.querySelector("ul");
  const row = (text, age) => {
    const li = document.createElement("li");
    li.innerHTML = `<button class="box" aria-label="Done"></button><span class="text"></span><span class="age"></span>`;
    li.querySelector(".text").textContent = text;
    li.querySelector(".age").textContent = age;
    li.querySelector(".box").onclick = () => {
      li.classList.add("is-done");
      setTimeout(() => li.remove(), 1000);
    };
    return li;
  };
  for (const [text, age] of SAMPLE) list.append(row(text, age));
  const empty = document.createElement("li");
  empty.innerHTML = `<span class="box" style="cursor:default"></span>`;
  if (live) {
    const input = document.createElement("input");
    input.placeholder = "";
    input.setAttribute("aria-label", "New item");
    input.onkeydown = (e) => {
      if (e.key !== "Enter" || !input.value.trim()) return;
      list.insertBefore(row(input.value.trim(), "now"), empty);
      input.value = "";
    };
    empty.append(input);
  }
  list.append(empty);
}
document.querySelectorAll('[data-list="static"]').forEach((r) => appWindow(r, false));
document.querySelectorAll('[data-list="live"]').forEach((r) => appWindow(r, true));

// ── Variant C: mono list, clock, date ────────────────────────
const mono = document.querySelector('[data-list="mono"]');
const count = document.querySelector("[data-count]");
const renderCount = () => {
  const open = mono.querySelectorAll("p:not(.is-done)").length;
  count.textContent = `(${open} open)`;
};
for (const [text, age] of SAMPLE) {
  const p = document.createElement("p");
  p.innerHTML = `<span class="cb">[ ]</span><span class="t"></span><span class="a"></span>`;
  p.querySelector(".t").textContent = text;
  p.querySelector(".a").textContent = age;
  p.onclick = () => {
    p.classList.toggle("is-done");
    p.querySelector(".cb").textContent = p.classList.contains("is-done") ? "[✓]" : "[ ]";
    renderCount();
  };
  mono.append(p);
}
renderCount();

const now = new Date();
document.querySelector("[data-today]").textContent = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
const clock = document.querySelector("[data-clock]");
const tick = () => {
  const d = new Date();
  clock.textContent = `${d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}, ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
};
tick();
setInterval(tick, 30_000);

show(current);
