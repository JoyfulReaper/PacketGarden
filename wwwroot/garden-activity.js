const recentActivityPanel = document.querySelector("#recent-activity");
const showRecentActivityControl = document.querySelector("#show-recent-activity");
const recentActivityRows = [0, 1, 2].map(index => document.querySelector(`#recent-event-${index}`));
let nextRecentActivityUpdateAt = 0;

function recentEventAge(receivedAt, now) {
  return window.PacketGardenUiCore.recentEventAge(receivedAt, now);
}

function recentEventText(entry, now) {
  return window.PacketGardenUiCore.recentEventText(entry, now, fakeSourceNames);
}

function renderRecentActivity(now = Date.now()) {
  recentActivityRows.forEach((row, index) => {
    const entry = gardenState.recentEvents[index];
    row.textContent = entry ? recentEventText(entry, now) : "";
    row.hidden = !entry;
  });
  nextRecentActivityUpdateAt = now + 1000;
}

function updateRecentActivityVisibility() {
  recentActivityPanel.hidden = !showRecentActivityControl.checked;
}

showRecentActivityControl.addEventListener("change", updateRecentActivityVisibility);
updateRecentActivityVisibility();

// Share the existing garden tick; no event-specific timers or stored raw frames.
function updateRecentActivity(now) {
  if (gardenState.recentEvents.length > 0 && now >= nextRecentActivityUpdateAt) renderRecentActivity(now);
}

renderRecentActivity();
