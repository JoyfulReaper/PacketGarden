// Logical hits and priority only. Renderers own input coordinates and actions.
(function () {
  'use strict';
  const common = typeof module !== 'undefined' && module.exports;
  const core = common ? require('./garden-core.js') : window.PacketGardenCore;
  const ambient = common ? require('./garden-ambient.js') : window.PacketGardenAmbient;
  const mutations = common ? require('./garden-mutations.js') : window.PacketGardenMutations;
  const { width, height, cellSize } = core.dimensions;
  const validPoint = point => Boolean(point && Number.isFinite(point.x) && Number.isFinite(point.y)
    && point.x >= 0 && point.x < width && point.y >= 0 && point.y < height);
  function ambientAt(point, items, at, position, radius) {
    if (!validPoint(point)) return null;
    for (let index = items.length - 1; index >= 0; index--) {
      const item = items[index]; if (at >= item.expiresAt) continue;
      const p = position(item, at);
      if (Math.hypot(point.x - p.x, point.y - p.y) <= radius) return item;
    }
    return null;
  }
  const curiosityAt = (point, items, at = Date.now()) => ambientAt(point, items, at, ambient.curiosityPosition, ambient.curiosityConfig.hitRadius);
  const looseDropAt = (point, items, at = Date.now()) => ambientAt(point, items, at, ambient.looseDropPosition, ambient.dropConfig.hitRadius);
  function mutationHit(specimen, point, at = Date.now()) {
    return validPoint(point) && mutations.isMutationActive(specimen, at)
      && Math.hypot(point.x - (specimen.column + .5) * cellSize, point.y - (specimen.row + .5) * cellSize) <= 12;
  }
  function specimenAt(point, specimens) {
    if (!validPoint(point)) return null;
    const column = Math.floor(point.x / cellSize), row = Math.floor(point.y / cellSize);
    return specimens.find(p => p.column === column && p.row === row) ?? null;
  }
  function resolve(point, { specimens = [], curiosities = [], drops = [], gnomes = null, frogs = null, reducedMotion = false }, at = Date.now()) {
    if (!validPoint(point)) return null;
    const gnome = gnomes?.hitAt(point,at);
    if (gnome) return {kind:'gnome',object:gnome};
    const curiosity = curiosityAt(point, curiosities, at);
    if (curiosity) return { kind: 'curiosity', object: curiosity };
    const drop = looseDropAt(point, drops, at);
    if (drop) return { kind: 'drop', object: drop };
    const frog = frogs?.hitAt?.(point, at, reducedMotion);
    if (frog) return { kind: 'frog', object: frog };
    const specimen = specimenAt(point, specimens);
    return specimen ? { kind: mutationHit(specimen, point, at) ? 'mutation' : 'specimen', specimen } : null;
  }
  // CSS client -> renderer presentation -> root-local coordinates. Backing/DPR never enters this calculation.
  function pointFromClient(clientX, clientY, rect, presentation, fit) {
    if (!(rect.width > 0 && rect.height > 0 && presentation.width > 0 && presentation.height > 0 && fit.scale > 0)) return null;
    const point = { x: ((clientX - rect.left) * presentation.width / rect.width - fit.x) / fit.scale,
      y: ((clientY - rect.top) * presentation.height / rect.height - fit.y) / fit.scale };
    return validPoint(point) ? point : null;
  }
  const api = { validPoint, curiosityAt, looseDropAt, mutationHit, specimenAt, resolve, pointFromClient };
  if (common) module.exports = api; else window.PacketGardenInteraction = api;
})();
