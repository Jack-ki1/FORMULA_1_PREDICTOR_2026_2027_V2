/**
 * grid_editor.js — Manual Grid Entry (P1-P22).
 * Renders into a container element; the resulting {code: position} map is
 * exactly what dashboard/api/predict expects as `grid_positions`.
 */
(function () {
  "use strict";

  function buildOptions(selected, drivers) {
    let html = '<option value="">—</option>';
    drivers.forEach((d) => {
      html += `<option value="${d.code}" ${d.code === selected ? "selected" : ""}>${d.code} · ${F1.escapeHtml(d.name)}</option>`;
    });
    return html;
  }

  function render(container, opts) {
    const drivers = opts.drivers || [];
    const seedGrid = opts.seedGrid || null; // {code: pos}
    const currentGrid = opts.currentGrid || null;

    // Build initial P1..P22 -> code assignment
    const seeded = seedGrid
      ? Object.entries(seedGrid).sort((a, b) => a[1] - b[1]).map(([code]) => code)
      : [];
    const draft = {};
    for (let pos = 1; pos <= 22; pos++) {
      draft[pos] = (currentGrid && Object.entries(currentGrid).find(([, p]) => p === pos)?.[0])
        || seeded[pos - 1]
        || (drivers[pos - 1] ? drivers[pos - 1].code : "");
    }

    function duplicates() {
      const counts = {};
      Object.values(draft).forEach((c) => { if (c) counts[c] = (counts[c] || 0) + 1; });
      return Object.entries(counts).filter(([, n]) => n > 1).map(([c]) => c);
    }

    function paint() {
      const dupes = duplicates();
      let rowsHtml = "";
      for (let pos = 1; pos <= 22; pos++) {
        const isDup = dupes.includes(draft[pos]);
        rowsHtml += `
          <div class="grid-row ${isDup ? "is-duplicate" : ""}" style="border:none">
            <span class="f1-mono fs-11 font-bold flex-shrink-0" style="color:var(--sub);width:28px">P${pos}</span>
            <select data-pos="${pos}" class="grid-pos-select">${buildOptions(draft[pos], drivers)}</select>
          </div>`;
      }

      container.innerHTML = `
        <div class="card p-4 mb-4" style="border-color:var(--red)">
          <div class="flex items-center justify-between mb-2">
            <div class="f1-display font-bold">Manual Grid Entry — P1 to P22</div>
            <button id="grid-cancel-top" class="fs-11 font-semibold text-sub">Cancel</button>
          </div>
          <p class="text-xs mb-3 text-sub">Assign a driver to each starting position. This overrides both live and simulated qualifying for the race prediction.</p>
          <div id="grid-dup-warning"></div>
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-4 grid-editor-list">${rowsHtml}</div>
          <div class="flex gap-2">
            <button id="grid-apply" class="btn-primary text-xs uppercase tracking-wide">Apply Manual Grid</button>
            <button id="grid-cancel" class="btn-ghost text-xs uppercase tracking-wide">Cancel</button>
          </div>
        </div>`;

      const warn = container.querySelector("#grid-dup-warning");
      if (dupes.length) {
        warn.innerHTML = `<div class="fs-11 font-semibold mb-3 px-3 py-2 rounded-lg" style="background:var(--red-tint);color:var(--red)">
          &#9888;&#65039; Duplicate driver(s) assigned: ${dupes.join(", ")} — each driver should occupy one grid slot.
        </div>`;
      } else {
        warn.innerHTML = "";
      }

      container.querySelectorAll(".grid-pos-select").forEach((sel) => {
        sel.addEventListener("change", (e) => {
          draft[Number(e.target.dataset.pos)] = e.target.value;
          paint();
        });
      });
      container.querySelector("#grid-apply").addEventListener("click", () => {
        const grid = {};
        Object.entries(draft).forEach(([pos, code]) => { if (code) grid[code] = Number(pos); });
        opts.onApply(grid);
      });
      container.querySelector("#grid-cancel").addEventListener("click", opts.onCancel);
      container.querySelector("#grid-cancel-top").addEventListener("click", opts.onCancel);
    }

    paint();
  }

  window.F1GridEditor = { render: render };
})();
