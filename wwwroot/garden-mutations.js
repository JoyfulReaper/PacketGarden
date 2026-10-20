// Exact-specimen mutation rules. The garden owns presence, occupancy and expiry.
(function () {
  'use strict';
  const core = typeof module !== 'undefined' && module.exports ? require('./garden-core.js') : window.PacketGardenCore;
  const config = Object.freeze({ port22WeedChance: .05, mutationDelayMs: 3000, maxActive: 3, collectibleLifetimeMs: 20000 });
  const type = 'collectible_weed';
  const isMutationActive = (specimen, at = Date.now()) => specimen?.mutation?.type === type && at < specimen.mutation.expiresAt;
  const mutationLabel = (specimen, at = Date.now()) => isMutationActive(specimen, at) ? 'Collectible weed' : 'None';
  function createMutationModel({ garden, now = Date.now, random = Math.random, onChange = () => {} }) {
    const counts = { scheduled: 0, activations: 0, capSkips: 0, cancellations: 0, expiries: 0 };
    const present = specimen => garden.specimens.includes(specimen);
    const notify = (kind, specimen, reason) => onChange({ kind, specimen, reason });
    function scheduleMutation(specimen, mutationType, at = now()) {
      if (!present(specimen) || mutationType !== type || specimen.pendingMutation || specimen.mutation
        || core.lifecycleStage(specimen, at) === 'expired') return false;
      specimen.pendingMutation = { type: mutationType, activateAt: at + config.mutationDelayMs };
      counts.scheduled++; notify('pending', specimen); return true;
    }
    function maybeSchedulePort22Mutation(specimen, roll, at = now()) {
      if (specimen?.type !== 'redbloom' || specimen.origin?.kind !== 'tcpnoise'
        || specimen.origin.listenPort !== 22 || !present(specimen)) return false;
      roll ??= random();
      if (!Number.isFinite(roll) || roll < 0 || roll >= config.port22WeedChance) return false;
      return scheduleMutation(specimen, type, at);
    }
    function activateMutation(specimen, at = now()) {
      const pending = specimen.pendingMutation;
      if (!pending || at < pending.activateAt || !present(specimen)) return false;
      delete specimen.pendingMutation; // Every due attempt is consumed, including cap skips.
      if (specimen.mutation || pending.type !== type || core.lifecycleStage(specimen, at) === 'expired') {
        counts.cancellations++; notify('pending-cancelled', specimen, 'ineligible'); return false;
      }
      if (garden.specimens.filter(item => isMutationActive(item, at)).length >= config.maxActive) {
        counts.capSkips++; notify('activation-skipped-cap', specimen); return false;
      }
      specimen.mutation = { type: pending.type, createdAt: at, expiresAt: at + config.collectibleLifetimeMs };
      counts.activations++; notify('activated', specimen); return true;
    }
    // Called synchronously from the garden's removal notification. No retained source references.
    function removed(specimen, reason) {
      if (specimen.pendingMutation) {
        delete specimen.pendingMutation; counts.cancellations++; notify('pending-cancelled', specimen, reason);
      }
      if (specimen.mutation && reason === 'expired') { counts.expiries++; notify('expired', specimen); }
    }
    function tick(at = now()) {
      // The caller reconciles garden expiry first. Pending markers live only on those exact survivors.
      let changed = false;
      for (const specimen of garden.specimens) if (activateMutation(specimen, at)) changed = true;
      return changed;
    }
    function snapshot(at = now()) {
      return { active: garden.specimens.filter(p => isMutationActive(p, at)).length,
        pending: garden.specimens.filter(p => p.pendingMutation).length, ...counts };
    }
    return { counts, scheduleMutation, maybeSchedulePort22Mutation, activateMutation, tick, removed, snapshot,
      clear: () => garden.clear() };
  }
  const api = { config, createMutationModel, isMutationActive, mutationLabel };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else window.PacketGardenMutations = api;
})();
