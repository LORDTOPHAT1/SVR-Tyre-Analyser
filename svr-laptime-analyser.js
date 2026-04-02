// ============================================================
// TAB SWITCHING
// ============================================================
function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');
  document.getElementById(`panel-${tab}`).classList.add('active');
}

// ============================================================
// LAP TIME PARSER
// ============================================================
function parseLapTimes(raw) {
  const lines = raw.trim().split('\n').map(l => l.trim()).filter(l => l);
  const laps = [];
  let i = 0;
  while (i < lines.length) {
    // Lap number line — digits only, optional ! or PB suffix on next line
    const lapNumMatch = lines[i].match(/^(\d+)[!]?$/);
    if (lapNumMatch && i + 1 < lines.length) {
      const lapNum = parseInt(lapNumMatch[1]);
      i++;
      // Time line — may have PB appended
      const timeLine = lines[i].replace('PB','').trim();
      const timeMatch = timeLine.match(/^(\d+):(\d+)\.(\d+)$/);
      if (timeMatch) {
        const mins = parseInt(timeMatch[1]);
        const secs = parseInt(timeMatch[2]);
        const ms = parseInt(timeMatch[3]);
        const totalMs = (mins * 60 * 1000) + (secs * 1000) + ms;
        i++;
        // Fuel or Refueled line
        let isPit = false;
        if (i < lines.length) {
          if (lines[i] === 'Refueled') isPit = true;
          i++;
        }
        // Remaining line
        if (i < lines.length && lines[i].startsWith('(Remaining:')) i++;
        laps.push({ lap: lapNum, ms: totalMs, isPit });
      } else {
        i++;
      }
    } else {
      i++;
    }
  }
  return laps;
}

function parseTyreExport(raw) {
  const stints = [];
  try {
    const lines = raw.split('\n');
    let currentStint = null;
    for (const line of lines) {
      const stintMatch = line.match(/Stint (\d+) — (\w+) — (\d+) laps/);
      if (stintMatch) {
        currentStint = { id: parseInt(stintMatch[1]), compound: stintMatch[2], laps: parseInt(stintMatch[3]), avgWearPerLap: 0 };
        stints.push(currentStint);
      }
      if (currentStint) {
        const avgMatch = line.match(/Avg:.*?([\d.]+)% per lap/);
        if (avgMatch) currentStint.avgWearPerLap = parseFloat(avgMatch[1]);
      }
    }
  } catch(e) {}
  return stints;
}

function splitIntoStints(laps) {
  // Refuel lap belongs to the NEXT stint as its opening lap
  // It counts toward tyre lap count but is excluded from lap time averages
  const stints = [];
  let current = [];
  for (const lap of laps) {
    if (lap.isPit) {
      // End current stint without the pit lap
      if (current.length > 0) stints.push({ laps: current });
      // Start next stint with the pit lap as first entry (flagged so it skips averages)
      current = [{ ...lap, isRefuelLap: true }];
    } else {
      current.push(lap);
    }
  }
  if (current.length > 0) stints.push({ laps: current });
  return stints;
}

function msToTime(ms) {
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  const centis = Math.floor((ms % 1000) / 10);
  return `${mins}:${String(secs).padStart(2,'0')}.${String(centis).padStart(2,'0')}`;
}

// ============================================================
// LAP TIME ANALYSE
// ============================================================
function analyseLapTimes() {
  const errorMsg = document.getElementById('ltErrorMsg');
  errorMsg.style.display = 'none';

  const raw = document.getElementById('ltPaste').value.trim();
  const tyrePasteRaw = document.getElementById('ltTyrePaste').value.trim();
  const cliffThresh = parseFloat(document.getElementById('ltCliff').value) || 1.5;
  const incidentThresh = parseFloat(document.getElementById('ltIncident').value) || 2.0;

  if (!raw) {
    errorMsg.textContent = 'Please paste your GT7 lap time data.';
    errorMsg.style.display = 'block';
    return;
  }

  const allLaps = parseLapTimes(raw);
  if (allLaps.length === 0) {
    errorMsg.textContent = 'Could not read any laps. Check the paste format matches the GT7 export.';
    errorMsg.style.display = 'block';
    return;
  }

  try {
    const raceLaps = allLaps.filter(l => l.lap > 1);
    const stints = splitIntoStints(raceLaps);
    const tyreStints = tyrePasteRaw ? parseTyreExport(tyrePasteRaw) : [];

  // Process each stint
  const processedStints = stints.map((stint, idx) => {
    const tyreLaps = stint.laps;
    // Exclude refuel lap AND first flying lap of each stint (cold tyres)
    const allAnalysisLaps = stint.laps.filter(l => !l.isRefuelLap);
    const warmupLap = allAnalysisLaps[0] || null; // first lap of stint — cold tyres, excluded
    const analysisLaps = allAnalysisLaps.slice(1); // everything after warm-up lap

    // Step 1: remove incidents using local rolling average
    const incidentLaps = [];
    const nonIncidentLaps = [];
    for (let i = 0; i < analysisLaps.length; i++) {
      const lap = analysisLaps[i];
      const neighbours = [];
      for (let j = Math.max(0, i-2); j <= Math.min(analysisLaps.length-1, i+2); j++) {
        if (j !== i) neighbours.push(analysisLaps[j].ms);
      }
      const localAvg = neighbours.length > 0
        ? neighbours.reduce((a,b) => a+b, 0) / neighbours.length
        : lap.ms;
      if ((lap.ms - localAvg) / 1000 > incidentThresh) {
        incidentLaps.push({ ...lap, reason: 'incident' });
      } else {
        nonIncidentLaps.push(lap);
      }
    }

    // Step 2: average of remaining laps is the pace baseline
    const avgCleanMs = nonIncidentLaps.length > 0
      ? nonIncidentLaps.reduce((s,l) => s+l.ms, 0) / nonIncidentLaps.length : 0;

    // Step 3: cliff = average + threshold. 2 consecutive laps above = confirmed cliff
    const cliffMs = avgCleanMs + (cliffThresh * 1000);
    const cleanLaps = nonIncidentLaps; // alias for display

    let cliffLapNum = null;
    for (let i = 0; i < cleanLaps.length - 1; i++) {
      if (cleanLaps[i].ms >= cliffMs && cleanLaps[i+1].ms >= cliffMs) {
        cliffLapNum = cleanLaps[i].lap;
        break;
      }
    }
    // Single last lap above cliff with no recovery
    if (!cliffLapNum && cleanLaps.length > 0) {
      const last = cleanLaps[cleanLaps.length - 1];
      if (last.ms >= cliffMs) cliffLapNum = last.lap;
    }

    const fastestClean = cleanLaps.length > 0
      ? Math.min(...cleanLaps.map(l => l.ms)) : 0;

    // Cliff percentage — wear % remaining when cliff lap was reached
    const tyreData = tyreStints[idx] || null;
    let cliffPct = null;
    if (cliffLapNum && tyreData && tyreData.avgWearPerLap > 0) {
      const firstLapNum = allAnalysisLaps.length > 0 ? allAnalysisLaps[0].lap : 0;
      const lapsToCliff = cliffLapNum - firstLapNum;
      const wornAtCliff = lapsToCliff * tyreData.avgWearPerLap;
      cliffPct = Math.max(0, Math.min(100, 100 - wornAtCliff));
    }

    // Pace degradation per lap (linear regression)
    let degradationPerLap = 0;
    if (cleanLaps.length >= 3) {
      const n = cleanLaps.length;
      const xMean = (n - 1) / 2;
      const yMean = cleanLaps.reduce((s,l) => s + l.ms, 0) / n;
      let num = 0, den = 0;
      cleanLaps.forEach((l, i) => {
        num += (i - xMean) * (l.ms - yMean);
        den += (i - xMean) ** 2;
      });
      degradationPerLap = den > 0 ? num / den : 0;
    }

    return {
      stintNum: idx + 1,
      laps: tyreLaps,
      analysisLaps: allAnalysisLaps,
      warmupLap,
      cleanLaps,
      incidentLaps,
      fastestClean,
      avgCleanMs,
      cliffMs,
      cliffLapNum,
      cliffPct,
      degradationPerLap,
      tyreData
    };
  });

  renderLapTimeResults(processedStints, cliffThresh);

  } catch(err) {
    errorMsg.textContent = 'Error: ' + err.message;
    errorMsg.style.display = 'block';
    errorMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// ============================================================
// RENDER LAP TIME RESULTS
// ============================================================
function renderLapTimeResults(stints, cliffThresh) {
  // Build chart
  const allLapNums = [];
  const allTimes = [];
  const pointColors = [];
  const pointRadii = [];

  // Collect laps for chart — skip refuel laps and warm-up laps
  const lapDataForChart = [];
  for (const stint of stints) {
    for (const lap of stint.analysisLaps) {
      if (stint.warmupLap && lap.lap === stint.warmupLap.lap) continue; // skip warm-up
      const isIncident = stint.incidentLaps.some(l => l.lap === lap.lap);
      const isPastCliff = !isIncident && stint.cliffLapNum !== null && lap.lap >= stint.cliffLapNum;
      lapDataForChart.push({ lap: lap.lap, ms: lap.ms, isIncident, isPastCliff });
    }
  }

  const minMs = Math.min(...lapDataForChart.map(l => l.ms));
  const maxMs = Math.max(...lapDataForChart.map(l => l.ms));
  const totalLaps = lapDataForChart.length;

  // Draw canvas
  const LAP_WIDTH = 32; // px per lap slot
  const MAX_LAPS = 40;
  const padL = 64, padR = 24, padT = 20, padB = 36;
  const canvasW = Math.max(padL + padR + (totalLaps * LAP_WIDTH), 320);
  const canvasH = 220;
  const chartW = canvasW - padL - padR;
  const chartH = canvasH - padT - padB;

  const canvas = document.getElementById('ltCanvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const wrap = document.getElementById('ltChartWrap');
  wrap.style.overflowX = 'auto';

  const ctx2 = canvas.getContext('2d');
  ctx2.clearRect(0, 0, canvasW, canvasH);

  // Background
  ctx2.fillStyle = '#080810';
  ctx2.fillRect(0, 0, canvasW, canvasH);

  // Y axis range — add 2s buffer above worst lap
  const yMin = minMs - 1000;
  const yMax = maxMs + 1000;

  function xPos(lapIdx) {
    return padL + lapIdx * LAP_WIDTH + LAP_WIDTH / 2;
  }
  function yPos(ms) {
    return padT + chartH - ((ms - yMin) / (yMax - yMin)) * chartH;
  }

  const dataWidth = totalLaps * LAP_WIDTH;

  // Grid lines
  ctx2.strokeStyle = '#1e1e35';
  ctx2.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padT + (i / 4) * chartH;
    ctx2.beginPath();
    ctx2.moveTo(padL, y);
    ctx2.lineTo(padL + dataWidth, y);
    ctx2.stroke();
    const ms = yMax - (i / 4) * (yMax - yMin);
    ctx2.fillStyle = '#6060a0';
    ctx2.font = '10px monospace';
    ctx2.textAlign = 'right';
    ctx2.fillText(msToTime(ms), padL - 4, y + 4);
  }

  // Stint dividers
  let lapIdx = 0;
  for (let s = 0; s < stints.length - 1; s++) {
    lapIdx += stints[s].laps.length;
    const x = xPos(lapIdx - 0.5);
    ctx2.strokeStyle = '#2a2a50';
    ctx2.setLineDash([4, 4]);
    ctx2.lineWidth = 1;
    ctx2.beginPath();
    ctx2.moveTo(x, padT);
    ctx2.lineTo(x, padT + chartH);
    ctx2.stroke();
    ctx2.setLineDash([]);
  }

  // Line connecting clean laps
  ctx2.strokeStyle = 'rgba(168,85,247,0.4)';
  ctx2.lineWidth = 1.5;
  ctx2.beginPath();
  let first = true;
  lapDataForChart.forEach((ld, i) => {
    if (!ld.isIncident) {
      const x = xPos(i), y = yPos(ld.ms);
      if (first) { ctx2.moveTo(x, y); first = false; }
      else ctx2.lineTo(x, y);
    }
  });
  ctx2.stroke();

  // Points
  lapDataForChart.forEach((ld, i) => {
    const x = xPos(i), y = yPos(ld.ms);
    let color = '#a855f7';
    let r = 4;
    if (ld.isIncident) { color = '#f59e0b'; r = 5; }
    else if (ld.isPastCliff) { color = '#ef4444'; r = 5; }

    ctx2.beginPath();
    ctx2.arc(x, y, r, 0, Math.PI * 2);
    ctx2.fillStyle = color;
    ctx2.fill();

    // Lap number on x axis
    ctx2.fillStyle = '#6060a0';
    ctx2.font = '9px monospace';
    ctx2.textAlign = 'center';
    ctx2.fillText(ld.lap, x, canvasH - 6);
  });

  // Stint summary cards
  const cardsEl = document.getElementById('ltStintCards');
  cardsEl.innerHTML = '';

  const exportLines = ['--- SVR Lap Time Report ---', ''];

  for (const stint of stints) {
    const td = stint.tyreData;
    const div = document.createElement('div');
    div.className = 'lt-stint-card';

    const cliffText = stint.cliffLapNum
      ? `Lap ${stint.cliffLapNum} <span class="cliff-tag">CLIFF</span>`
      : '<span style="color:var(--ok)">None detected</span>';

    const incidentText = stint.incidentLaps.length > 0
      ? stint.incidentLaps.map(l => `Lap ${l.lap} <span class="incident-tag">INCIDENT</span>`).join(' ')
      : '<span style="color:var(--muted)">None</span>';

    const cliffPctText = stint.cliffPct !== null
      ? `<span style="color:var(--warn);font-family:'Orbitron',sans-serif;font-size:1.1rem;font-weight:700">${stint.cliffPct.toFixed(1)}%</span>`
      : td ? '<span style="color:var(--muted)">Paste tyre data to calculate</span>'
           : '<span style="color:var(--muted)">Need tyre data</span>';

    div.innerHTML = `
      <div class="lt-stint-header">
        <div class="lt-stint-label">Stint ${stint.stintNum}${td ? ' — ' + td.compound : ''}</div>
        <div style="font-size:0.65rem;color:var(--muted)">${stint.laps.length} laps on tyre</div>
      </div>
      ${stint.cliffPct !== null ? `
      <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);border-radius:6px;padding:10px 14px;margin-bottom:10px;font-size:0.72rem;">
        <div style="font-size:0.52rem;letter-spacing:0.15em;text-transform:uppercase;color:var(--muted);margin-bottom:4px;">Cliff threshold — use this in Tyre Wear tab</div>
        ${cliffPctText} tyre wear remaining
      </div>` : ''}
      <div class="lt-stats-grid">
        <div class="lt-stat">
          <div class="lt-stat-label">Fastest clean</div>
          <div class="lt-stat-value">${stint.fastestClean ? msToTime(stint.fastestClean) : '—'}</div>
        </div>
        <div class="lt-stat">
          <div class="lt-stat-label">Average clean</div>
          <div class="lt-stat-value">${stint.avgCleanMs ? msToTime(Math.round(stint.avgCleanMs)) : '—'}</div>
        </div>
        <div class="lt-stat">
          <div class="lt-stat-label">Cliff lap (avg +${cliffThresh}s)</div>
          <div class="lt-stat-value">${cliffText}</div>
        </div>
        <div class="lt-stat">
          <div class="lt-stat-label">Incidents</div>
          <div class="lt-stat-value">${incidentText}</div>
        </div>
        ${td ? `
        <div class="lt-stat">
          <div class="lt-stat-label">Avg wear per lap</div>
          <div class="lt-stat-value">${td.avgWearPerLap.toFixed(2)}%</div>
        </div>` : ''}
        ${stint.degradationPerLap !== 0 ? `
        <div class="lt-stat">
          <div class="lt-stat-label">Pace trend per lap</div>
          <div class="lt-stat-value" style="color:${stint.degradationPerLap > 0 ? 'var(--caution)' : 'var(--ok)'}">
            ${stint.degradationPerLap > 0 ? '+' : ''}${(stint.degradationPerLap / 1000).toFixed(3)}s
          </div>
        </div>` : ''}
      </div>
    `;
    cardsEl.appendChild(div);

    exportLines.push(`Stint ${stint.stintNum}${td ? ' — ' + td.compound : ''} — ${stint.laps.length} laps on tyre`);
    if (stint.cliffPct !== null) exportLines.push(`  >> Cliff threshold: ${stint.cliffPct.toFixed(1)}% (use this in Tyre Wear tab)`);
    exportLines.push(`  Fastest: ${msToTime(stint.fastestClean)}  |  Avg clean: ${msToTime(Math.round(stint.avgCleanMs))}`);
    if (stint.degradationPerLap !== 0) exportLines.push(`  Pace trend: ${stint.degradationPerLap > 0 ? '+' : ''}${(stint.degradationPerLap/1000).toFixed(3)}s per lap`);
    if (stint.cliffLapNum) exportLines.push(`  Cliff lap: ${stint.cliffLapNum} (+${cliffThresh}s threshold)`);
    if (stint.incidentLaps.length > 0) exportLines.push(`  Incidents: ${stint.incidentLaps.map(l => 'Lap ' + l.lap).join(', ')}`);
    if (td) exportLines.push(`  Tyre wear avg: ${td.avgWearPerLap.toFixed(2)}% per lap`);
    exportLines.push('');
  }

  exportLines.push('[ SVR Tyre Wear Analyser ]');
  document.getElementById('ltExportText').value = exportLines.join('\n');
  document.getElementById('ltResultsSection').style.display = 'block';
  setTimeout(() => document.getElementById('ltResultsSection').scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
}

function copyLtExport() {
  const ta = document.getElementById('ltExportText');
  ta.select();
  navigator.clipboard.writeText(ta.value).then(() => {
    const btn = document.getElementById('ltCopyBtn');
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = 'Copy to clipboard', 2000);
  }).catch(() => {
    document.execCommand('copy');
    const btn = document.getElementById('ltCopyBtn');
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = 'Copy to clipboard', 2000);
  });
}

// ============================================================
// INIT — start with one stint
// ============================================================
addStint();
