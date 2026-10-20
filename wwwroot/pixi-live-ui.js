// DOM-only UI adapter. Logical hit priority/text come from the same helpers as Canvas.
(function () {
  'use strict';
  const common = typeof module !== 'undefined' && module.exports;
  const interaction = common ? require('./garden-interaction.js') : window.PacketGardenInteraction;
  const text = common ? require('./garden-ui-core.js') : window.PacketGardenUiCore;
  function createUi({ document, window, garden, ambient, colorName, now = Date.now, onCollected = () => {} }) {
    const element = id => document.querySelector(`#${id}`);
    const card = element('specimen-card'), title = element('specimen-card-title'), closeButton = element('specimen-card-close');
    const fields = Object.fromEntries(['source','sensor','port','seen-count','vigor','color','age','mutation'].map(id => [id, element(`specimen-${id}`)]));
    const message = element('collection-message'), panel = element('recent-activity'), toggle = element('show-recent-activity');
    const rows = [0,1,2].map(index => element(`recent-event-${index}`));
    const sourceNames = { ...text.fakeSourceNames, seed: 'Simulated garden seed', 'mutation-test': 'Simulated mutation fixture', 'interaction-test': 'Simulated interaction fixture' };
    let inspected = null, anchor = null, messageUntil = 0, nextUpdateAt = 0;
    const setText = (node, value) => { if (node.textContent !== value) node.textContent = value; };
    function close() { inspected = null; anchor = null; card.hidden = true; }
    function position() {
      if (!anchor) return;
      const gap = 12, width = card.offsetWidth || 280, height = card.offsetHeight || 240;
      card.style.left = `${Math.min(Math.max(gap, window.innerWidth - width - gap), Math.max(gap, anchor.x + gap))}px`;
      card.style.top = `${Math.min(Math.max(gap, window.innerHeight - height - gap), Math.max(gap, anchor.y + gap))}px`;
    }
    function renderInspection(at) {
      const info = text.inspection(inspected, at, { sourceNames, colorName: colorName(inspected) });
      setText(title, info.title);
      for (const key of Object.keys(fields)) setText(fields[key], info[key === 'seen-count' ? 'seenCount' : key]);
    }
    function inspect(specimen, client, at = now()) {
      if (!garden.specimens.includes(specimen)) { close(); return false; }
      inspected = specimen; anchor = client; renderInspection(at); card.hidden = false; position(); return true;
    }
    function removed(specimen) { if (inspected === specimen) close(); }
    function showMessage(value, at = now()) {
      message.textContent = value; message.hidden = false; messageUntil = at + text.messageDurationMs;
    }
    function activity(at = now()) {
      rows.forEach((row, index) => {
        const entry = garden.recentEvents[index];
        setText(row, entry ? text.recentEventText(entry, at, sourceNames) : ''); row.hidden = !entry;
      });
    }
    const visibility = () => { panel.hidden = !toggle.checked; };
    const keydown = event => { if (event.key === 'Escape') close(); };
    closeButton.addEventListener('click', close); toggle.addEventListener('change', visibility); window.addEventListener('keydown', keydown);
    visibility(); activity();
    function tick(at = now()) {
      if (inspected && !garden.specimens.includes(inspected)) close();
      if (messageUntil && at >= messageUntil) { message.textContent = ''; message.hidden = true; messageUntil = 0; }
      if (at < nextUpdateAt) return;
      nextUpdateAt = at + 1000;
      if (inspected) renderInspection(at);
      if (garden.recentEvents.length) activity(at);
    }
    function click(point, client, at = now()) {
      if (!interaction.validPoint(point)) return null; // Letterbox/outside clicks have no action.
      const hit = interaction.resolve(point, { specimens: garden.specimens, curiosities: ambient.curiosities, drops: ambient.drops }, at);
      if (!hit) { close(); return null; }
      if (hit.kind === 'specimen') { inspect(hit.specimen, client, at); return hit; }
      const item = hit.object ?? hit.specimen;
      const removedItem = hit.kind === 'curiosity' ? ambient.removeCuriosity(item, 'collected')
        : hit.kind === 'drop' ? ambient.removeDrop(item, 'collected') : garden.remove(item, 'collected');
      if (removedItem) {
        if (hit.kind === 'mutation') removed(item);
        showMessage(text.messages[hit.kind === 'mutation' ? item.mutation.type : item.type], at);
        onCollected();
      }
      return hit;
    }
    return { click, inspect, close, removed, activity, tick, position, showMessage, get inspected() { return inspected; },
      destroy() { close(); closeButton.removeEventListener('click', close); toggle.removeEventListener('change', visibility); window.removeEventListener('keydown', keydown); } };
  }
  const api = { createUi };
  if (common) module.exports = api; else window.PacketGardenPixiUi = api;
})();
