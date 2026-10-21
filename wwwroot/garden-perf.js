// Opt-in, browser-local profiling only. Disabled mode creates no observer or samples.
function createGardenPerformanceDiagnostics() {
  if (!/(?:^|[?&])perf=1(?:&|$)/.test(window.location?.search ?? "")) return null;
  const capacity = 120, panelEveryMs = 500;
  const baseKeys = ["total", "setup", "soil", "grass", "puddles", "specimens", "vines", "wireferns", "otherSpecies", "lookup"];
  const overlayKeys = ["total", "setup", "mutations", "actors", "curiosities", "drops", "rain", "rainStreaks"];
  const ring = () => ({ values: new Array(capacity), next: 0, size: 0 });
  const base = ring(), overlay = ring(), deadlineOnly = ring(), rafGaps = ring();
  const push = (buffer, sample) => {
    buffer.values[buffer.next] = sample;
    buffer.next = (buffer.next + 1) % capacity;
    buffer.size = Math.min(capacity, buffer.size + 1);
  };
  const reasons = Object.fromEntries(["initial", "state-change", "visual-deadline", "resize", "weather-soil", "grass-change", "puddle-change", "specimen-change", "resume", "other"].map(reason => [reason, 0]));
  const pendingReasons = new Set();
  const counts = {
    baseRebuilds: 0, overlayPaints: 0, forcedOverlayPaints: 0, fpsSkips: 0,
    baseOver16: 0, baseOver33: 0, overlayOver16: 0, overlayOver33: 0,
    longestBase: 0, longestOverlay: 0, deadlineOnlyRebuilds: 0,
    vineLookupBuilds: 0, vineNeighborChecks: 0, vinesRendered: 0, wirefernsRendered: 0,
    rainStreaks: 0, layoutReads: 0, backingResizes: 0, backingWrites: 0,
    rafGapsOver50: 0, rafGapsWithBase: 0, longestRafGap: 0, longTasks: 0, longestLongTask: 0, panelUpdates: 0
  };
  let activeBase = null, activeOverlay = null, lastRafAt = null, lastRafObservedAt = null, lastBaseFinishedAt = null, lastPanelAt = -Infinity;
  const panel = document.querySelector("#garden-perf");
  panel.hidden = false;
  panel.textContent = "PERF · collecting browser-local samples…";
  let observer = null;
  try {
    const Observer = window.PerformanceObserver;
    if (Observer?.supportedEntryTypes?.includes("longtask")) {
      observer = new Observer(list => {
        for (const entry of list.getEntries()) {
          counts.longTasks++;
          counts.longestLongTask = Math.max(counts.longestLongTask, entry.duration);
        }
      });
      observer.observe({ type: "longtask", buffered: false });
    }
  } catch { observer = null; }

  function begin(kind, forced = false) {
    const at = performance.now();
    const sample = { at, marker: at };
    for (const key of kind === "base" ? baseKeys : overlayKeys) sample[key] = 0;
    if (kind === "base") {
      sample.reasons = pendingReasons.size ? Array.from(pendingReasons) : ["other"];
      activeBase = sample;
    } else {
      sample.forced = forced;
      activeOverlay = sample;
    }
  }
  function mark(kind, key) {
    const sample = kind === "base" ? activeBase : activeOverlay;
    const now = performance.now();
    sample[key] += now - sample.marker;
    sample.marker = now;
  }
  function end(kind) {
    const sample = kind === "base" ? activeBase : activeOverlay;
    const finishedAt = performance.now();
    sample.total = finishedAt - sample.at;
    delete sample.marker;
    push(kind === "base" ? base : overlay, sample);
    if (kind === "base") {
      lastBaseFinishedAt = finishedAt;
      counts.baseRebuilds++;
      counts.baseOver16 += Number(sample.total > 1000 / 60);
      counts.baseOver33 += Number(sample.total > 1000 / 30);
      counts.longestBase = Math.max(counts.longestBase, sample.total);
      for (const reason of sample.reasons) reasons[reason]++;
      if (sample.reasons.length === 1 && sample.reasons[0] === "visual-deadline") {
        counts.deadlineOnlyRebuilds++; push(deadlineOnly, sample);
      }
      pendingReasons.clear(); activeBase = null;
    } else {
      counts.overlayPaints++;
      counts.forcedOverlayPaints += Number(sample.forced);
      counts.overlayOver16 += Number(sample.total > 1000 / 60);
      counts.overlayOver33 += Number(sample.total > 1000 / 30);
      counts.longestOverlay = Math.max(counts.longestOverlay, sample.total);
      activeOverlay = null;
    }
  }
  function stats(buffer, key = "total") {
    let sum = 0, max = 0;
    for (let index = 0; index < buffer.size; index++) {
      const value = buffer.values[index][key]; sum += value; max = Math.max(max, value);
    }
    const last = buffer.size ? buffer.values[(buffer.next + capacity - 1) % capacity][key] : 0;
    return { last, avg: buffer.size ? sum / buffer.size : 0, max };
  }
  function rate(buffer, now) {
    let total = 0;
    for (let index = 0; index < buffer.size; index++) if (now - buffer.values[index].at < 1000) total++;
    return total;
  }
  function snapshot(now = performance.now()) {
    return {
      lighting: typeof gardenLighting === 'undefined' ? null : { ...gardenLighting.snapshot(), ...gardenLightingSurface.snapshot() },
      base: Object.fromEntries(baseKeys.map(key => [key, stats(base, key)])),
      overlay: Object.fromEntries(overlayKeys.map(key => [key, stats(overlay, key)])),
      deadlineOnly: stats(deadlineOnly), rafGap: stats(rafGaps), counts: { ...counts }, reasons: { ...reasons },
      lastReasons: base.size ? base.values[(base.next + capacity - 1) % capacity].reasons.slice() : [],
      rates: { base: rate(base, now), overlay: rate(overlay, now) },
      samples: { base: base.size, overlay: overlay.size, deadlineOnly: deadlineOnly.size, rafGaps: rafGaps.size, capacity },
      nextBaseVisualAt, untilNextBaseVisualMs: nextBaseVisualAt === null ? null : Math.max(0, nextBaseVisualAt - Date.now()),
      longTaskSupported: observer !== null
    };
  }
  function updatePanel() {
    if (document.hidden) return false;
    const now = performance.now();
    if (now - lastPanelAt < panelEveryMs) return false;
    lastPanelAt = now;
    const data = snapshot(now);
    const ms = metric => `${metric.last.toFixed(2)} / ${metric.avg.toFixed(2)} / ${metric.max.toFixed(2)}`;
    const lines = ["PERF · last / avg / max ms · last 120 samples", "CPU submission timings; not GPU/compositor or GC timings",
      `Base ${ms(data.base.total)} · ~${data.rates.base}/s · n=${counts.baseRebuilds}`,
      `  Setup/layout ${ms(data.base.setup)} · soil/grid ${ms(data.base.soil)}`,
      `  Grass ${ms(data.base.grass)} · puddles ${ms(data.base.puddles)}`,
      `  Specimens ${ms(data.base.specimens)}`,
      `    Vines ${ms(data.base.vines)} · wireferns ${ms(data.base.wireferns)}`,
      `    Other ${ms(data.base.otherSpecies)} · lookup ${ms(data.base.lookup)}`,
      `  Deadline-only ${ms(data.deadlineOnly)} · n=${counts.deadlineOnlyRebuilds}`,
      `  Next visual: ${data.nextBaseVisualAt === null ? "none" : `${data.nextBaseVisualAt} · in ${(data.untilNextBaseVisualMs / 1000).toFixed(2)}s`}`,
      `  Last reasons: ${data.lastReasons.join(", ")}`,
      `  >16.7ms ${counts.baseOver16} · >33.3ms ${counts.baseOver33} · longest ${counts.longestBase.toFixed(2)}`,
      `Overlay ${ms(data.overlay.total)} · ~${data.rates.overlay}/s · n=${counts.overlayPaints}`,
      `  Setup ${ms(data.overlay.setup)} · mutations ${ms(data.overlay.mutations)}`,
      `  Actors ${ms(data.overlay.actors)} · curiosities ${ms(data.overlay.curiosities)}`,
      `  Drops ${ms(data.overlay.drops)} · rain ${ms(data.overlay.rain)}`,
      `  Rain streaks last ${data.overlay.rainStreaks.last} · forced paints ${counts.forcedOverlayPaints}`,
      `  >16.7ms ${counts.overlayOver16} · >33.3ms ${counts.overlayOver33} · longest ${counts.longestOverlay.toFixed(2)}`,
      `  FPS-cap skips ${counts.fpsSkips} (intentional, not lost frames)`,
      `RAF gap ${ms(data.rafGap)} · >50ms ${counts.rafGapsOver50} · with base ${counts.rafGapsWithBase}`,
      `  Longest RAF gap ${counts.longestRafGap.toFixed(2)}ms (session)`,
      `Vine lookups ${counts.vineLookupBuilds} · checks ${counts.vineNeighborChecks} · renders ${counts.vinesRendered}`,
      `Wirefern renders ${counts.wirefernsRendered}`,
      `Layout reads ${counts.layoutReads} · backing resizes ${counts.backingResizes} (${counts.backingWrites} dimension writes)`,
      `Canvas CSS ${(gardenView?.width ?? 0).toFixed(1)}×${(gardenView?.height ?? 0).toFixed(1)} · DPR ${(gardenView?.pixelRatio ?? 0).toFixed(2)}`,
      `Backing base ${gardenBaseCanvas.width}×${gardenBaseCanvas.height} · overlay ${gardenOverlayCanvas.width}×${gardenOverlayCanvas.height}`,
      `Garden specimens ${gardenState.specimens.length} · grass ${gardenState.grassCells.length} · puddles ${gardenState.puddles.length}`,
      `Curiosities ${gardenState.curiosities.length} · drops ${gardenState.drops.length} · actors ${gardenState.actors.length}`,
      `Long tasks ${observer ? counts.longTasks : "unsupported"} · longest ${counts.longestLongTask.toFixed(2)}ms (not proof of GC)`,
      "Reason totals: " + Object.entries(reasons).filter(([, count]) => count).map(([reason, count]) => `${reason} ${count}`).join(" · ")];
    panel.textContent = lines.join("\n"); counts.panelUpdates++;
    return true;
  }
  return {
    begin, mark, end, snapshot, updatePanel,
    reset() {
      for (const buffer of [base, overlay, deadlineOnly, rafGaps]) {
        buffer.values.fill(undefined); buffer.next = 0; buffer.size = 0;
      }
      for (const key of Object.keys(counts)) counts[key] = 0;
      for (const key of Object.keys(reasons)) reasons[key] = 0;
      pendingReasons.clear(); activeBase = activeOverlay = null;
      lastRafAt = lastRafObservedAt = lastBaseFinishedAt = null; lastPanelAt = -Infinity;
    },
    reason(reason) { pendingReasons.add(Object.hasOwn(reasons, reason) ? reason : "other"); },
    count(key, value = 1) { counts[key] += value; },
    specimen(type, startedAt) {
      activeBase[type === "vine" ? "vines" : type === "wirefern" ? "wireferns" : "otherSpecies"] += performance.now() - startedAt;
      if (type === "vine") counts.vinesRendered++;
      if (type === "wirefern") counts.wirefernsRendered++;
    },
    lookup(startedAt) { if (activeBase) activeBase.lookup += performance.now() - startedAt; },
    rain(streaks) { if (activeOverlay) activeOverlay.rainStreaks += streaks; counts.rainStreaks += streaks; },
    raf(now) {
      const observedAt = performance.now();
      if (lastRafAt !== null) {
        const total = now - lastRafAt; push(rafGaps, { at: now, total });
        counts.rafGapsOver50 += Number(total > 50); counts.longestRafGap = Math.max(counts.longestRafGap, total);
        // Frame timestamps precede callbacks. Compare actual callback observation times.
        // A base completion between callbacks is correlation, not proof of causation.
        if (total > 50 && lastBaseFinishedAt !== null && lastBaseFinishedAt >= lastRafObservedAt && lastBaseFinishedAt <= observedAt) counts.rafGapsWithBase++;
      }
      lastRafAt = now;
      lastRafObservedAt = observedAt;
    },
    pauseRaf() { lastRafAt = lastRafObservedAt = null; },
    dispose() { observer?.disconnect(); }
  };
}
