const recentActivityRows = [0, 1, 2].map(index => document.querySelector(`#recent-event-${index}`));
let nextRecentActivityUpdateAt = 0;

function recentEventAge(receivedAt, now) {
  const seconds = Math.max(0, Math.floor((now - receivedAt) / 1000));
  return seconds === 0 ? "now" : seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m`;
}

function recentEventText(entry, now) {
  const parts = entry.kind === "tcpnoise"
    ? [entry.sensor, `:${entry.listenPort}`, entry.specimenType, entry.seenCount === null ? null : `seen ${entry.seenCount}`]
    : [fakeSourceNames[entry.eventType], entry.specimenType];
  parts.push(recentEventAge(entry.receivedAt, now));
  if (entry.outcome === "dropped") parts.push("no growth");
  return parts.filter(part => part !== null).join(" · ");
}

function renderRecentActivity(now = Date.now()) {
  recentActivityRows.forEach((row, index) => {
    const entry = gardenState.recentEvents[index];
    row.textContent = entry ? recentEventText(entry, now) : "";
    row.hidden = !entry;
  });
  nextRecentActivityUpdateAt = now + 1000;
}

// Share the existing garden tick; no event-specific timers or stored raw frames.
function updateRecentActivity(now) {
  if (gardenState.recentEvents.length > 0 && now >= nextRecentActivityUpdateAt) renderRecentActivity(now);
}

renderRecentActivity();
