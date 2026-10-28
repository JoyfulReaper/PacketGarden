// Shared display text and bounded recent activity; no rendering or input actions.
(function () {
  'use strict';
  const mutations = typeof module !== 'undefined' && module.exports ? require('./garden-mutations.js') : window.PacketGardenMutations;
  const fakeSourceNames = Object.freeze({ dns: 'Simulated DNS', gopher: 'Simulated Gopher', http: 'Simulated HTTP',
    ssh: 'Simulated SSH', 'port22-probe': 'Simulated port 22 probe', 'weed-bud-test': 'Simulated weed bud fixture', 'weed-harvest-test':'Simulated weed harvest fixture',
    'poppy-fixture': 'Simulated poppy fixture', 'poppy-replacement': 'Simulated vine replacement' });
  const vigorNames = Object.freeze(['one-off', 'repeated', 'frequent', 'persistent']);
  const messages = Object.freeze({ ladybug: 'You caught a ladybug. +0 points', snail: 'You collected a snail. It seems annoyed. +0 points',
    moth: 'You caught a moth. +0 points', shiny_pebble: 'You found a rock. +0 points',
    amanita_muscaria: 'You found Amanita muscaria. +0 points', ditch_weed_bud: 'You smoked some ditch weed. +0 points',
    opium_pod: 'You collected an opium pod. +0 points',
    gnome_underpants: "You stole a gnome's underpants. +0 points", collectible_weed: 'You collected some weed. +0 points' });
  function collectionMessage(type, random = Math.random) {
    return type === 'gnome_underpants' && random() >= .8 ? 'Collected underpants +1, annoyed gnome -1' : messages[type];
  }
  const messageDurationMs = 2000;
  const capitalize = name => name.charAt(0).toUpperCase() + name.slice(1);
  function formatAge(ageMs) {
    const seconds = Math.max(0, Math.floor(ageMs / 1000));
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60), remainder = seconds % 60;
    return remainder === 0 ? `${minutes}m` : `${minutes}m ${remainder}s`;
  }
  function recentEventAge(receivedAt, now) {
    const seconds = Math.max(0, Math.floor((now - receivedAt) / 1000));
    return seconds === 0 ? 'now' : seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m`;
  }
  function recentEventText(entry, now, sourceNames = fakeSourceNames) {
    const parts = entry.kind === 'tcpnoise'
      ? [entry.sensor, `:${entry.listenPort}`, entry.specimenType, entry.seenCount === null ? null : `seen ${entry.seenCount}`]
      : [sourceNames[entry.eventType], entry.specimenType];
    parts.push(recentEventAge(entry.receivedAt, now));
    if (entry.outcome === 'dropped') parts.push('no growth');
    return parts.filter(part => part !== null).join(' · ');
  }
  function appendRecent(entries, entry) {
    // Copy only UI fields. Callers supply normalized event values; discarded frame fields never survive here.
    const safe = entry.kind === 'tcpnoise'
      ? { kind: 'tcpnoise', specimenType: entry.specimenType, listenPort: entry.listenPort,
        sensor: entry.sensor, seenCount: entry.seenCount, receivedAt: entry.receivedAt, outcome: entry.outcome }
      : { kind: 'simulated', eventType: entry.eventType, specimenType: entry.specimenType, receivedAt: entry.receivedAt, outcome: entry.outcome };
    entries.unshift(safe); entries.length = Math.min(entries.length, 3); return safe;
  }
  function inspection(specimen, at, { colorName, sourceNames = fakeSourceNames } = {}) {
    const origin = specimen.origin ?? {}, vigor = specimen.vigor ?? 0;
    if(specimen.type==='stillbloom')return {title:'Stillbloom',source:origin.kind==='quiet'?'Sustained quiet':'Simulated Stillbloom',sensor:'—',port:'—',seenCount:'—',vigor:'—',color:'Ivory · silver-green',age:formatAge(at-specimen.createdAt),mutation:'None'};
    const singular = { broadleaf: 'broad-leaf plant', redbloom: 'red bloom', crystalfungus: 'crystal fungus' }[specimen.type] ?? specimen.type;
    return { title: mutations.isPoppyActive(specimen, at) ? 'Opium poppy · original vine' : capitalize(singular), source: origin.kind === 'tcpnoise' ? 'Live TCPNoise' : sourceNames[origin.eventType] ?? 'Garden event',
      sensor: origin.sensor ?? (origin.kind === 'tcpnoise' ? 'Not supplied' : 'Development controls'),
      port: Number.isInteger(origin.listenPort) ? String(origin.listenPort) : '—', seenCount: origin.seenCount ?? '—',
      vigor: `${vigor} — ${vigorNames[vigor] ?? 'unknown'}`, color: colorName ?? 'Default',
      age: formatAge(at - specimen.createdAt), mutation: mutations.mutationLabel(specimen, at) };
  }
  const frogMessage = 'The frog ignores you +0 points';
  const api = { fakeSourceNames, vigorNames, messages, collectionMessage, frogMessage, messageDurationMs, capitalize, formatAge, recentEventAge, recentEventText, appendRecent, inspection };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else window.PacketGardenUiCore = api;
})();
