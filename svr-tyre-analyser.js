
// ============================================================
// TRACK SEARCH
// ============================================================
let selectedTrack = null;

function filterTracks() {
  const q = document.getElementById('trackSearch').value.toLowerCase();
  const matches = TRACKS.filter(t => t.name.toLowerCase().includes(q));
  renderTrackDropdown(matches);
}

function openTrackDropdown() {
  renderTrackDropdown(TRACKS);
  document.getElementById('trackDropdown').classList.add('open');
}

function closeTrackDropdown() {
  setTimeout(() => document.getElementById('trackDropdown').classList.remove('open'), 200);
}

function renderTrackDropdown(tracks) {
  const dd = document.getElementById('trackDropdown');
  dd.innerHTML = tracks.map(t => {
    const idx = TRACKS.indexOf(t);
    return `<div class="track-option${selectedTrack && selectedTrack.name===t.name?' selected':''}" onmousedown="selectTrack(${idx})">${t.name}</div>`;
  }).join('');
  dd.classList.add('open');
}

function selectTrack(idx) {
  selectedTrack = TRACKS[idx];
  document.getElementById('trackSearch').value = selectedTrack.name;
  document.getElementById('trackValue').value = selectedTrack.name;
  populateWeather(selectedTrack.rain);
}

function populateWeather(hasRain) {
  const sel = document.getElementById('weather');
  const all = hasRain ? [...DRY_WEATHER, ...RAIN_WEATHER] : DRY_WEATHER;
  sel.innerHTML = `<option value="">Select weather</option>` +
    all.map(w => `<option value="${w.split('|')[0].trim()}">${w}</option>`).join('');
}

// ============================================================
// CAR DATA + SEARCH
// ============================================================
const CARS = [
  'BMW M6 GT3 Endurance Model \'16',
  'Ferrari 296 GT3 \'23',
  'Huracán GT3 \'15',
  'McLaren 650S GT3 \'15',
  'Peugeot RCZ Gr.3',
  'Porsche 911 GT3 R (992) \'22',
  'Porsche 911 RSR (991) \'17',
  'Red Bull X2014 Junior',
  'Super Formula Honda SF23'
];

let selectedCar = null;

function filterCars() {
  const q = document.getElementById('carSearch').value.toLowerCase();
  const matches = CARS.filter(c => c.toLowerCase().includes(q));
  renderCarDropdown(matches);
}

function openCarDropdown() {
  renderCarDropdown(CARS);
  document.getElementById('carDropdown').classList.add('open');
}

function closeCarDropdown() {
  setTimeout(() => document.getElementById('carDropdown').classList.remove('open'), 200);
}

function renderCarDropdown(cars) {
  const dd = document.getElementById('carDropdown');
  dd.innerHTML = cars.map(c =>
    `<div class="track-option${selectedCar===c?' selected':''}" onmousedown="selectCar('${c.replace(/'/g,'\\\'')}')">${c}</div>`
  ).join('');
  dd.classList.add('open');
}

function selectCar(name) {
  selectedCar = name;
  document.getElementById('carSearch').value = name;
  document.getElementById('carValue').value = name;
}
let stintCount = 0;
let stintData = [];

function addStint() {
  stintCount++;
  const id = stintCount;
  stintData.push({ id, image: null, imageData: null });

  const card = document.createElement('div');
  card.className = 'stint-card';
  card.id = `stint-card-${id}`;
  card.innerHTML = `
    <div class="stint-header">
      <div class="stint-number">Stint ${id}</div>
      ${id > 1 ? `<button class="stint-remove" onclick="removeStint(${id})">✕ Remove</button>` : ''}
    </div>
    <div class="stint-body">
      <div class="upload-zone" id="zone-${id}" onclick="triggerUpload(${id})">
        <input type="file" id="file-${id}" accept="image/*" style="display:none" onchange="handleFile(${id}, event)">
        <div class="upload-icon">📸</div>
        <p><strong>Tap to upload stint ${id} screenshot</strong></p>
        <p>Pause replay at pit entry (or finish line for last stint)</p>
      </div>
      <img class="upload-preview" id="preview-${id}" alt="Preview">
      <div class="stint-fields">
        <div class="field">
          <label>Compound</label>
          <select id="compound-${id}">
            <option value="RS">Racing Soft (RS)</option>
            <option value="RM" selected>Racing Medium (RM)</option>
            <option value="RH">Racing Hard (RH)</option>
            <option value="INT">Intermediate</option>
            <option value="WET">Wet</option>
          </select>
        </div>
        <div class="field">
          <label>Pit lap</label>
          <input type="number" id="pitlap-${id}" placeholder="e.g. 13" min="1" max="500">
          <div class="field-note">Lap you pitted (or final lap)</div>
        </div>
        <div class="field">
          <label>Cliff threshold (%)</label>
          <input type="number" id="cliff-${id}" value="40" min="5" max="60">
          <div class="field-note">Wear % where pace drops</div>
        </div>
      </div>
    </div>
  `;
  document.getElementById('stintsContainer').appendChild(card);
}

function removeStint(id) {
  const card = document.getElementById(`stint-card-${id}`);
  if (card) card.remove();
  stintData = stintData.filter(s => s.id !== id);
}

function triggerUpload(id) {
  document.getElementById(`file-${id}`).click();
}

function handleFile(id, event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const sd = stintData.find(s => s.id === id);
    if (sd) {
      sd.image = e.target.result;
      sd.imageData = null;
    }
    const preview = document.getElementById(`preview-${id}`);
    preview.src = e.target.result;
    preview.classList.add('visible');
    document.getElementById(`zone-${id}`).classList.add('has-image');
  };
  reader.readAsDataURL(file);
}

// ============================================================
// PIXEL READING
// ============================================================
function readTyreWear(img, scale) {
  return new Promise(resolve => {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const readings = {};
    const debugLines = [];

    for (const key of TYRE_KEYS) {
      const r = REGIONS_4K[key];
      const rx = Math.round(r.x * scale);
      const ry = Math.round(r.y * scale);
      const rw = Math.round(r.w * scale);
      const rh = Math.round(r.h * scale);
      const expectedPixels = Math.round(FULL_PIXELS * scale * scale);
      const data = ctx.getImageData(rx, ry, rw, rh).data;
      let white = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] > 180 && data[i+1] > 180 && data[i+2] > 180) white++;
      }
      const pct = Math.min(100, (white / expectedPixels) * 100);
      readings[key] = parseFloat(pct.toFixed(1));
      debugLines.push(`${key.toUpperCase()}: ${white} white / ${expectedPixels} total = ${pct.toFixed(1)}%`);
    }

    resolve({ readings, debug: debugLines.join('\n') });
  });
}

function loadImage(src) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = src;
  });
}

// ============================================================
// ANALYSE
// ============================================================
async function analyse() {
  const errorMsg = document.getElementById('errorMsg');
  errorMsg.style.display = 'none';

  const totalLaps = parseInt(document.getElementById('totalLaps').value) || 0;
  const wearMx = parseFloat(document.getElementById('wearMultiplier').value);
  const track = document.getElementById('trackValue').value || '';
  const weather = document.getElementById('weather').value || '';

  // Top-level validation
  if (!totalLaps) {
    errorMsg.textContent = 'Please enter the total race laps.';
    errorMsg.style.display = 'block';
    errorMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  // Collect active stints directly from DOM — avoids ID mismatch after removes
  const activeStints = [];
  const stintCards = document.querySelectorAll('.stint-card');
  for (const card of stintCards) {
    const id = card.id.replace('stint-card-', '');
    const sd = stintData.find(s => s.id === parseInt(id));
    if (!sd) continue;

    const pitLapEl = document.getElementById(`pitlap-${id}`);
    const compoundEl = document.getElementById(`compound-${id}`);
    const cliffEl = document.getElementById(`cliff-${id}`);

    if (!pitLapEl || !compoundEl || !cliffEl) continue;

    const pitLap = parseInt(pitLapEl.value) || 0;
    const compound = compoundEl.value;
    const cliff = parseFloat(cliffEl.value) || 40;

    if (!sd.image && !sd.loadedReadings) {
      errorMsg.textContent = `Stint ${activeStints.length + 1}: no screenshot uploaded.`;
      errorMsg.style.display = 'block';
      return;
    }
    if (!pitLap) {
      errorMsg.textContent = `Stint ${activeStints.length + 1}: please enter the pit lap.`;
      errorMsg.style.display = 'block';
      return;
    }
    activeStints.push({ id: parseInt(id), image: sd.image, pitLap, compound, cliff, loadedReadings: sd.loadedReadings || null });
  }

  if (activeStints.length === 0) {
    errorMsg.textContent = 'Add at least one stint before analysing.';
    errorMsg.style.display = 'block';
    return;
  }

  // Sort by pit lap
  activeStints.sort((a, b) => a.pitLap - b.pitLap);

  // Calculate stint lengths
  for (let i = 0; i < activeStints.length; i++) {
    const prevLap = i === 0 ? 0 : activeStints[i-1].pitLap;
    activeStints[i].stintLaps = activeStints[i].pitLap - prevLap;
  }

  // Read images
  const btn = document.querySelector('#panel-tyre .analyse-btn');
  btn.textContent = 'Analysing...';
  btn.disabled = true;

  btn.textContent = 'Analysing...';
  btn.disabled = true;

  try {
    const allDebug = [];
    for (const stint of activeStints) {
      // Use loaded readings if no image (session restore)
      let readings;
      if (stint.loadedReadings && !stint.image) {
        readings = stint.loadedReadings;
        allDebug.push(`--- Stint ${stint.id} (${stint.compound}) --- [loaded from session]`);
      } else {
        const img = await loadImage(stint.image);
        const scale = img.naturalWidth >= 3000 ? 1 : 0.5;
        const result = await readTyreWear(img, scale);
        readings = result.readings;

        if (Object.values(readings).every(v => v < 2)) {
          errorMsg.textContent = `Stint ${stint.id}: all tyres read near 0%. Make sure the tyre wear HUD is visible.`;
          errorMsg.style.display = 'block';
          errorMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
          btn.textContent = 'Analyse Race';
          btn.disabled = false;
          return;
        }
        allDebug.push(`--- Stint ${stint.id} (${stint.compound}) ---\n${result.debug}`);
      }

      stint.readings = readings;

      const results = {};
      for (const k of TYRE_KEYS) {
        const remaining = readings[k];
        const worn = 100 - remaining;
        const perLap = stint.stintLaps > 0 ? worn / stint.stintLaps : 0;
        const lapsToCliff = remaining > stint.cliff && perLap > 0
          ? Math.floor((remaining - stint.cliff) / perLap) : 0;
        const lapsToZero = perLap > 0 ? Math.floor(remaining / perLap) : 999;
        results[k] = { remaining, worn, perLap, lapsToCliff, lapsToZero };
      }
      stint.results = results;
    }

    btn.textContent = 'Analyse Race';
    btn.disabled = false;
    renderResults(activeStints, totalLaps, wearMx, track, weather, allDebug.join('\n\n'));

  } catch(err) {
    btn.textContent = 'Analyse Race';
    btn.disabled = false;
    errorMsg.textContent = 'Something went wrong: ' + err.message;
    errorMsg.style.display = 'block';
    errorMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// ============================================================
// RENDER
// ============================================================
function cliffHTML(laps) {
  if (laps <= 0) return `<span class="warn">NOW</span>`;
  if (laps <= 3) return `<span class="warn">${laps} laps</span>`;
  if (laps <= 8) return `<span class="caution">${laps} laps</span>`;
  return `<span class="ok">${laps} laps</span>`;
}

function renderResults(stints, totalLaps, wearMx, track, weather, debugText) {
  wearGraphActive = {};
  // Session pill
  const weatherCode = weather ? weather : '';
  const car = document.getElementById('carValue').value || '';
  document.getElementById('sessionPill').textContent =
    `${track}${weatherCode ? ' · ' + weatherCode : ''}${totalLaps ? ' · ' + totalLaps + ' laps' : ''} · ${wearMx}x wear${car ? ' · ' + car : ''}`;

  // Stint results
  const stintResultsEl = document.getElementById('stintResults');
  stintResultsEl.innerHTML = '';

  for (const stint of stints) {
    const r = stint.results;
    const avgRemaining = (TYRE_KEYS.reduce((s,k) => s + r[k].remaining, 0) / 4).toFixed(1);
    const avgPerLap = (TYRE_KEYS.reduce((s,k) => s + r[k].perLap, 0) / 4).toFixed(2);
    const avgLapsToCliff = TYRE_KEYS.reduce((s,k) => s + r[k].lapsToCliff, 0) / 4;
    const cliffLapsRounded = Math.round(avgLapsToCliff * 10) / 10;
    const limitingKey = TYRE_KEYS.reduce((a,b) => r[a].remaining < r[b].remaining ? a : b);
    const stintId = `stint-${stint.id}`;

    const div = document.createElement('div');
    div.className = 'stint-result';
    div.innerHTML = `
      <div class="collapsible-header" onclick="toggleCollapsible('${stintId}')" style="padding:0;background:none;border-radius:0;">
        <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0;">
          <div class="stint-result-label" style="margin:0;">Stint ${stint.id}</div>
          <div class="stint-compound-badge">${stint.compound}</div>
          <div class="stint-result-label" style="margin:0;font-size:0.7rem;color:var(--muted);font-family:inherit;letter-spacing:0;">${stint.stintLaps} laps</div>
          <div style="flex:1;min-width:0;font-size:0.68rem;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            Avg: <span style="color:var(--text)">${avgRemaining}%</span> · ${avgPerLap}%/lap · Cliff: <span style="color:var(--text)">${cliffLapsRounded} laps</span>
          </div>
        </div>
        <span class="collapsible-arrow" id="arrow-${stintId}">▼</span>
      </div>
      <div class="collapsible-body" id="body-${stintId}">
        <div class="tyre-grid" style="margin-top:14px;">
          ${TYRE_KEYS.map(k => `
            <div class="tyre-mini${k === limitingKey ? ' tyre-mini-limiting' : ''}">
              <div class="tyre-mini-label" style="color:${TYRE_COLORS[k]}">${TYRE_LABELS[k]}${k === limitingKey ? ' ★' : ''}</div>
              <div class="tyre-mini-pct" style="color:${TYRE_COLORS[k]}">${r[k].remaining.toFixed(1)}%</div>
              <div class="tyre-mini-bar-bg">
                <div class="tyre-mini-bar-fill" style="width:${r[k].remaining}%;background:${TYRE_COLORS[k]}"></div>
              </div>
              <div class="tyre-mini-stats">
                Worn: <span>${r[k].worn.toFixed(1)}%</span><br>
                Per lap: <span>${r[k].perLap.toFixed(2)}%</span><br>
                To cliff: ${cliffHTML(r[k].lapsToCliff)}<br>
                To zero: <span style="color:var(--muted)">${r[k].lapsToZero} laps</span>
              </div>
            </div>
          `).join('')}
        </div>
        <div class="stint-summary-row">
          <div class="summary-chip">Avg remaining: <span>${avgRemaining}%</span></div>
          <div class="summary-chip">Cliff threshold: <span>${stint.cliff}%</span></div>
          <div class="summary-chip">Limiting: <span style="color:${TYRE_COLORS[limitingKey]}">${TYRE_LABELS[limitingKey]}</span></div>
        </div>

      </div>
    `;
    stintResultsEl.appendChild(div);
  }

  // Pit optimiser
  const optimiserEl = document.getElementById('optimiserContent');
  const optimiserRows = [];

  for (let i = 0; i < stints.length; i++) {
    const stint = stints[i];
    const r = stint.results;
    const limitingKey = TYRE_KEYS.reduce((a,b) => r[a].lapsToCliff < r[b].lapsToCliff ? a : b);
    const limitingLaps = r[limitingKey].lapsToCliff;
    const limitingRemaining = r[limitingKey].remaining;

    if (i < stints.length - 1) {
      // Not final stint — only flag if 6+ laps left, mild note at 3-5
      if (limitingLaps >= 6) {
        optimiserRows.push(`
          <div class="optimiser-row">
            <div class="optimiser-icon">⚠️</div>
            <div class="optimiser-text">
              <strong>Stint ${stint.id} (${stint.compound})</strong> — Pitted with approximately
              <strong>${limitingLaps} laps</strong> still available on the ${TYRE_LABELS[limitingKey].toLowerCase()}
              (${limitingRemaining.toFixed(1)}% remaining vs ${stint.cliff}% cliff).
              This stint could have run longer.
            </div>
          </div>
        `);
      } else if (limitingLaps >= 3) {
        optimiserRows.push(`
          <div class="optimiser-row">
            <div class="optimiser-icon">🟡</div>
            <div class="optimiser-text">
              <strong>Stint ${stint.id} (${stint.compound})</strong> — Pitted with
              <strong>${limitingLaps} laps</strong> to cliff on the ${TYRE_LABELS[limitingKey].toLowerCase()}.
              A small margin remained but within acceptable range depending on traffic and race position.
            </div>
          </div>
        `);
      } else {
        optimiserRows.push(`
          <div class="optimiser-row">
            <div class="optimiser-icon">✅</div>
            <div class="optimiser-text">
              <strong>Stint ${stint.id} (${stint.compound})</strong> — Stop timing was good.
              ${limitingLaps <= 0
                ? `${TYRE_LABELS[limitingKey]} was at or past cliff (${limitingRemaining.toFixed(1)}% remaining).`
                : `${limitingLaps} lap${limitingLaps===1?'':'s'} to cliff on the ${TYRE_LABELS[limitingKey].toLowerCase()} — tight window, no time left on the table.`}
            </div>
          </div>
        `);
      }
    } else {
      // Final stint — just report the numbers, no judgement
      const finalRemaining = TYRE_KEYS.map(k => r[k].remaining);
      const lowestFinal = Math.min(...finalRemaining).toFixed(1);
      const lowestKey = TYRE_KEYS.reduce((a,b) => r[a].remaining < r[b].remaining ? a : b);
      optimiserRows.push(`
        <div class="optimiser-row">
          <div class="optimiser-icon">🏁</div>
          <div class="optimiser-text">
            <strong>Stint ${stint.id} (${stint.compound}) — Final stint.</strong>
            ${TYRE_LABELS[lowestKey]} was the most worn at the flag: <strong>${lowestFinal}%</strong> remaining.
            ${parseFloat(lowestFinal) > stint.cliff + 10
              ? `Still well above cliff at the end — next time you could potentially run a longer final stint or start it later.`
              : ``}
          </div>
        </div>
      `);
    }
  }

  // Cross-stint compound comparison if multiple stints
  if (stints.length > 1) {
    const compoundRates = {};
    for (const stint of stints) {
      const avgRate = (TYRE_KEYS.reduce((s,k) => s + stint.results[k].perLap, 0) / 4).toFixed(3);
      if (!compoundRates[stint.compound] || parseFloat(avgRate) < parseFloat(compoundRates[stint.compound].rate)) {
        compoundRates[stint.compound] = { rate: avgRate, stintId: stint.id };
      }
    }
    const compounds = Object.keys(compoundRates);
    if (compounds.length > 1) {
      const sorted = compounds.sort((a,b) => parseFloat(compoundRates[a].rate) - parseFloat(compoundRates[b].rate));
      optimiserRows.push(`
        <div class="optimiser-row">
          <div class="optimiser-icon">📊</div>
          <div class="optimiser-text">
            <strong>Compound comparison</strong> — ${sorted.map(c =>
              `${c}: <strong>${compoundRates[c].rate}% avg per lap</strong>`
            ).join(' · ')}.
            ${sorted[0]} showed the lowest average wear rate this race.
          </div>
        </div>
      `);
    }
  }

  optimiserEl.innerHTML = optimiserRows.join('');

  // Export text
  const lines = [
    `--- SVR Tyre Wear Report ---`,
    `${track}${weather ? ' · ' + weather : ''}${totalLaps ? ' · ' + totalLaps + ' laps' : ''} · ${wearMx}x wear`,
    ``
  ];

  for (const stint of stints) {
    const r = stint.results;
    const avgRemaining = (TYRE_KEYS.reduce((s,k) => s + r[k].remaining, 0) / 4).toFixed(1);
    const avgPerLap = (TYRE_KEYS.reduce((s,k) => s + r[k].perLap, 0) / 4).toFixed(2);

    // Cliff: use avg lapsToCliff (rounded)
    const avgLapsToCliff = TYRE_KEYS.reduce((s,k) => s + r[k].lapsToCliff, 0) / 4;
    const cliffLapsRounded = Math.round(avgLapsToCliff * 10) / 10;
    const cliffStatus = cliffLapsRounded <= 0
      ? `0 laps remaining`
      : `${cliffLapsRounded} lap${cliffLapsRounded === 1 ? '' : 's'} remaining`;

    // Limiting tyre = lowest remaining %
    const limitingKey = TYRE_KEYS.reduce((a,b) => r[a].remaining < r[b].remaining ? a : b);
    const limitingRemaining = r[limitingKey].remaining.toFixed(1);

    // Laps to 0% from current position (limiting tyre)
    const limitingPerLap = r[limitingKey].perLap;
    const lapsFromHere = limitingPerLap > 0
      ? Math.round((r[limitingKey].remaining / limitingPerLap) * 10) / 10
      : 0;
    // Total tyre life = laps already done + laps remaining from here
    const totalLife = Math.round((stint.stintLaps + lapsFromHere) * 10) / 10;

    lines.push(`Stint ${stint.id} — ${stint.compound} — ${stint.stintLaps} laps`);
    lines.push(`  Avg: ${avgRemaining}% remaining | ${avgPerLap}% per lap`);
    lines.push(`  Cliff: ${stint.cliff}% | ${cliffStatus}`);
    lines.push(`  Limiting: ${TYRE_LABELS[limitingKey]} (${limitingRemaining}%)`);
    lines.push(`  Laps till 0%: ${lapsFromHere} laps remaining [${totalLife} total]`);
    lines.push(``);
  }

  lines.push(`[ SVR Tyre Wear Analyser ]`);
  document.getElementById('exportText').value = lines.join('\n');

  // Debug
  document.getElementById('debugInfo').textContent = debugText;

  document.getElementById('resultsSection').style.display = 'block';
  renderWearGraph(stints);
  generateSessionCode(stints, totalLaps, wearMx, track, weather);
  setTimeout(() => document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
}

// ============================================================
// COPY
// ============================================================
function toggleCollapsible(id) {
  const body = document.getElementById(`body-${id}`);
  const arrow = document.getElementById(`arrow-${id}`);
  body.classList.toggle('open');
  arrow.classList.toggle('open');
}

// Palette for stint lines — background-safe, distinct colours
const STINT_PALETTE = [
  '#a855f7', // purple
  '#22d3ee', // teal
  '#f97316', // orange
  '#f43f5e', // pink-red
  '#84cc16', // lime
  '#facc15', // yellow
  '#38bdf8', // sky blue
  '#c084fc', // lavender
];

// Which stints are toggled on (by stint id)
let wearGraphActive = {};

function renderWearGraph(stints) {
  const canvas = document.getElementById('wearCanvas');
  const togglesEl = document.getElementById('wearGraphToggles');
  const legendEl = document.getElementById('wearGraphLegend');
  if (!canvas || !togglesEl || !legendEl) return;

  // Assign colours to stints
  stints.forEach((s, i) => {
    s._graphColor = STINT_PALETTE[i % STINT_PALETTE.length];
    if (wearGraphActive[s.id] === undefined) wearGraphActive[s.id] = true;
  });

  // Build toggle checkboxes (only once per render if not already built)
  togglesEl.innerHTML = '';
  stints.forEach(s => {
    const label = document.createElement('label');
    label.style.cssText = 'display:flex;align-items:center;gap:6px;cursor:pointer;font-size:0.72rem;color:var(--text);user-select:none;';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = wearGraphActive[s.id] !== false;
    cb.style.cssText = `accent-color:${s._graphColor};width:14px;height:14px;cursor:pointer;`;
    cb.addEventListener('change', () => {
      wearGraphActive[s.id] = cb.checked;
      drawWearGraph(stints);
    });
    const dot = document.createElement('span');
    dot.style.cssText = `display:inline-block;width:10px;height:10px;border-radius:50%;background:${s._graphColor};`;
    const txt = document.createElement('span');
    txt.textContent = `Stint ${s.id} ${s.compound}`;
    label.appendChild(cb);
    label.appendChild(dot);
    label.appendChild(txt);
    togglesEl.appendChild(label);
  });

  // Build legend
  legendEl.innerHTML = `
    <span style="display:flex;align-items:center;gap:5px;">
      <svg width="24" height="8"><line x1="0" y1="4" x2="24" y2="4" stroke="var(--text)" stroke-width="2"/><circle cx="12" cy="4" r="3" fill="var(--text)"/></svg>
      Actual wear
    </span>
    <span style="display:flex;align-items:center;gap:5px;">
      <svg width="24" height="8"><line x1="0" y1="4" x2="24" y2="4" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4,3"/></svg>
      Cliff threshold
    </span>
    <span style="display:flex;align-items:center;gap:5px;">
      <svg width="24" height="8"><line x1="0" y1="4" x2="24" y2="4" stroke="rgba(200,200,255,0.4)" stroke-width="1.5" stroke-dasharray="4,3"/></svg>
      Projection to 0%
    </span>
  `;

  drawWearGraph(stints);
}

function drawWearGraph(stints) {
  const canvas = document.getElementById('wearCanvas');
  if (!canvas) return;

  const padL = 44, padR = 20, padT = 18, padB = 36;
  const canvasH = 240;

  // Build per-lap data for each stint
  // Each lap: wear = 100 - (lapIndex * perLap) clamped to 0
  // We project forward to lap where wear hits 0
  const stintData = stints.map(s => {
    const avgPerLap = TYRE_KEYS.reduce((sum, k) => sum + s.results[k].perLap, 0) / 4;
    const avgRemaining = TYRE_KEYS.reduce((sum, k) => sum + s.results[k].remaining, 0) / 4;
    const stintLaps = s.stintLaps;
    const cliffPct = s.cliff;

    // Real data points: lap 0 = 100%, lap stintLaps = avgRemaining
    const realPoints = [];
    for (let lap = 0; lap <= stintLaps; lap++) {
      const pct = Math.max(0, 100 - lap * avgPerLap);
      realPoints.push({ lap, pct });
    }

    // Projection: continue from last real point to 0%
    const projPoints = [];
    if (avgPerLap > 0) {
      const lapsToZero = avgRemaining / avgPerLap;
      for (let lap = stintLaps; lap <= stintLaps + Math.ceil(lapsToZero) + 1; lap++) {
        const pct = Math.max(0, avgRemaining - (lap - stintLaps) * avgPerLap);
        projPoints.push({ lap, pct });
        if (pct <= 0) break;
      }
    }

    // Cliff intersection lap (within real data)
    let cliffLap = null;
    for (let i = 1; i < realPoints.length; i++) {
      if (realPoints[i-1].pct >= cliffPct && realPoints[i].pct <= cliffPct) {
        cliffLap = i - 1 + (realPoints[i-1].pct - cliffPct) / (realPoints[i-1].pct - realPoints[i].pct);
        break;
      }
    }

    return { s, avgPerLap, avgRemaining, stintLaps, cliffPct, realPoints, projPoints, cliffLap };
  });

  // Max lap across all visible stints (real + projection)
  const visibleData = stintData.filter(d => wearGraphActive[d.s.id] !== false);
  const maxLap = visibleData.length > 0
    ? Math.max(...visibleData.map(d => d.projPoints.length > 0 ? d.projPoints[d.projPoints.length - 1].lap : d.stintLaps))
    : 10;

  const LAP_STEP = Math.ceil(maxLap / 10) || 1;
  const xLabels = [];
  for (let l = 0; l <= maxLap; l += LAP_STEP) xLabels.push(l);
  if (xLabels[xLabels.length - 1] < maxLap) xLabels.push(maxLap);

  const canvasW = Math.max(padL + padR + (maxLap * 22), 320);
  canvas.width = canvasW;
  canvas.height = canvasH;

  const chartW = canvasW - padL - padR;
  const chartH = canvasH - padT - padB;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvasW, canvasH);
  ctx.fillStyle = '#080810';
  ctx.fillRect(0, 0, canvasW, canvasH);

  function xPos(lap) { return padL + (lap / maxLap) * chartW; }
  function yPos(pct) { return padT + chartH - (pct / 100) * chartH; }

  // Grid lines Y (0, 10, 20 ... 100)
  ctx.lineWidth = 1;
  for (let p = 0; p <= 100; p += 10) {
    const y = yPos(p);
    ctx.strokeStyle = p % 50 === 0 ? '#2a2a50' : '#1a1a2e';
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + chartW, y);
    ctx.stroke();
    ctx.fillStyle = '#6060a0';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${p}%`, padL - 4, y + 4);
  }

  // Grid lines X
  xLabels.forEach(l => {
    const x = xPos(l);
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, padT);
    ctx.lineTo(x, padT + chartH);
    ctx.stroke();
    ctx.fillStyle = '#6060a0';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${l}`, x, padT + chartH + 14);
  });

  // X axis label
  ctx.fillStyle = '#6060a0';
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Lap', padL + chartW / 2, canvasH - 4);

  // Draw each visible stint
  stintData.forEach(d => {
    if (wearGraphActive[d.s.id] === false) return;
    const color = d.s._graphColor;

    // Cliff horizontal dashed line (red, full width)
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(padL, yPos(d.cliffPct));
    ctx.lineTo(padL + chartW, yPos(d.cliffPct));
    ctx.stroke();
    ctx.setLineDash([]);

    // Projection line (faded dashed)
    if (d.projPoints.length > 1) {
      ctx.strokeStyle = color + '55';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      d.projPoints.forEach((p, i) => {
        const x = xPos(p.lap), y = yPos(p.pct);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Actual wear line (solid)
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    d.realPoints.forEach((p, i) => {
      const x = xPos(p.lap), y = yPos(p.pct);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Dots on real points — start and end only
    [d.realPoints[0], d.realPoints[d.realPoints.length - 1]].forEach(p => {
      if (!p) return;
      ctx.beginPath();
      ctx.arc(xPos(p.lap), yPos(p.pct), 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    });

    // Cliff intersection — label first (underneath), then dot on top
    if (d.cliffLap !== null) {
      const cx = xPos(d.cliffLap);
      const cy = yPos(d.cliffPct);
      // Label drawn first so dot renders over it
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`Cliff ~L${Math.round(d.cliffLap)}`, cx, cy - 12);
      // Dot drawn after
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#ef4444';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  });

  // Axes
  ctx.strokeStyle = '#2a2a50';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(padL, padT);
  ctx.lineTo(padL, padT + chartH);
  ctx.lineTo(padL + chartW, padT + chartH);
  ctx.stroke();
}

function copyExport() {
  const ta = document.getElementById('exportText');
  ta.select();
  navigator.clipboard.writeText(ta.value).then(() => {
    const btn = document.getElementById('copyBtn');
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = 'Copy to clipboard', 2000);
  }).catch(() => {
    document.execCommand('copy');
    const btn = document.getElementById('copyBtn');
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = 'Copy to clipboard', 2000);
  });
}

// ============================================================
// SESSION SAVE
// ============================================================

// Stored stints from last analysis (for re-analyse after load)
let loadedSessionStints = null;

function generateSessionCode(stints, totalLaps, wearMx, track, weather) {
  // Format: SVR1|track|weather|totalLaps|wearMx|car|S1:compound:pitLap:cliff:fl:fr:rl:rr|S2:...
  const car = document.getElementById('carValue').value || '';
  const stintParts = stints.map(s => {
    const r = s.results;
    return [
      s.compound,
      s.pitLap,
      s.cliff,
      r.fl.remaining.toFixed(1),
      r.fr.remaining.toFixed(1),
      r.rl.remaining.toFixed(1),
      r.rr.remaining.toFixed(1)
    ].join(':');
  });
  const code = ['SVR1', track, weather, totalLaps, wearMx, car, ...stintParts].join('|');

  const ta = document.getElementById('sessionSaveCode');
  const copyBtn = document.getElementById('sessionCopyBtn');
  ta.value = code;
  copyBtn.style.display = 'inline-block';
}

function copySessionCode() {
  const ta = document.getElementById('sessionSaveCode');
  const btn = document.getElementById('sessionCopyBtn');
  navigator.clipboard.writeText(ta.value).then(() => {
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = 'Copy code', 2000);
  }).catch(() => {
    ta.select();
    document.execCommand('copy');
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = 'Copy code', 2000);
  });
}

function loadSessionCode() {
  const ta = document.getElementById('sessionSaveCode');
  const msg = document.getElementById('sessionSaveMsg');
  const code = ta.value.trim();

  msg.style.display = 'none';

  if (!code) {
    showSessionMsg('Paste a session code first.', 'var(--warn)');
    return;
  }

  const parts = code.split('|');
  if (parts.length < 6 || parts[0] !== 'SVR1') {
    showSessionMsg('Invalid session code. Make sure you copied the full code.', 'var(--warn)');
    return;
  }

  try {
    const [header, track, weather, totalLapsStr, wearMxStr, carOrStint, ...rest] = parts;
    const totalLaps = parseInt(totalLapsStr);
    const wearMx = parseFloat(wearMxStr);

    // Detect new format (SVR1 with car field) vs old format (no car field)
    // New format: carOrStint is the car name (no colons), rest has stint parts
    // Old format: carOrStint is the first stint (has colons), rest has remaining stints
    let car = '';
    let stintParts;
    if (carOrStint && !carOrStint.includes(':')) {
      // New format — carOrStint is the car name
      car = carOrStint;
      stintParts = rest;
    } else {
      // Old format — carOrStint is first stint
      car = '';
      stintParts = carOrStint ? [carOrStint, ...rest] : rest;
    }

    if (!stintParts.length) throw new Error('No stint data found.');

    const stints = stintParts.map((sp, i) => {
      const fields = sp.split(':');
      if (fields.length < 7) throw new Error(`Stint ${i+1} data is incomplete.`);
      const [compound, pitLapStr, cliffStr, fl, fr, rl, rr] = fields;
      const pitLap = parseInt(pitLapStr);
      const cliff = parseFloat(cliffStr);
      const readings = {
        fl: parseFloat(fl), fr: parseFloat(fr),
        rl: parseFloat(rl), rr: parseFloat(rr)
      };
      return { id: i + 1, compound, pitLap, cliff, readings };
    });

    // Calculate stint lengths
    stints.sort((a, b) => a.pitLap - b.pitLap);
    for (let i = 0; i < stints.length; i++) {
      const prevLap = i === 0 ? 0 : stints[i-1].pitLap;
      stints[i].stintLaps = stints[i].pitLap - prevLap;
    }

    // Calculate results from readings
    for (const stint of stints) {
      const results = {};
      for (const k of TYRE_KEYS) {
        const remaining = stint.readings[k];
        const worn = 100 - remaining;
        const perLap = stint.stintLaps > 0 ? worn / stint.stintLaps : 0;
        const lapsToCliff = remaining > stint.cliff && perLap > 0
          ? Math.floor((remaining - stint.cliff) / perLap) : 0;
        const lapsToZero = perLap > 0 ? Math.floor(remaining / perLap) : 999;
        results[k] = { remaining, worn, perLap, lapsToCliff, lapsToZero };
      }
      stint.results = results;
    }

    // Repopulate top fields
    if (track) document.getElementById('trackValue').value = track;
    if (track) document.getElementById('trackSearch').value = track;
    if (weather) document.getElementById('weather').value = weather;
    if (totalLaps) document.getElementById('totalLaps').value = totalLaps;
    if (wearMx) document.getElementById('wearMultiplier').value = wearMx;
    if (car) {
      document.getElementById('carValue').value = car;
      document.getElementById('carSearch').value = car;
      selectedCar = car;
    }

    // Repopulate stint boxes
    const container = document.getElementById('stintsContainer');
    container.innerHTML = '';
    stintData.length = 0;
    stintCount = 0;

    for (const stint of stints) {
      addStint();
      const id = stintData[stintData.length - 1].id;
      document.getElementById(`compound-${id}`).value = stint.compound;
      document.getElementById(`pitlap-${id}`).value = stint.pitLap;
      document.getElementById(`cliff-${id}`).value = stint.cliff;
      // Mark as loaded (no image)
      stintData[stintData.length - 1].loadedReadings = stint.readings;
      stintData[stintData.length - 1].pitLap = stint.pitLap;
      stintData[stintData.length - 1].compound = stint.compound;
      stintData[stintData.length - 1].cliff = stint.cliff;
    }

    // Store for re-analyse
    loadedSessionStints = stints;

    showSessionMsg('Session loaded. Running analysis...', 'var(--ok)');

    // Auto-run results directly (no images needed)
    renderResults(stints, totalLaps, wearMx, track, weather, 'Loaded from session code.');

    setTimeout(() => {
      document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 200);

  } catch(err) {
    showSessionMsg('Could not load session: ' + err.message, 'var(--warn)');
  }
}

function showSessionMsg(text, color) {
  const msg = document.getElementById('sessionSaveMsg');
  msg.textContent = text;
  msg.style.color = color || 'var(--text)';
  msg.style.display = 'block';
  setTimeout(() => msg.style.display = 'none', 4000);
}


function toggleInfo() {
  const body = document.getElementById('infoBody');
  const arrow = document.getElementById('infoArrow');
  body.classList.toggle('open');
  arrow.classList.toggle('open');
}
