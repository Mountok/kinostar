/* Shared dimensions for the seating plan, camera and collision geometry. */
(function (root) {
  'use strict';
  const config = Object.freeze({ rows: 8, cols: 14, halfWidth: 7.7, front: 1.2, back: 19.2, radius: 0.18, rowGap: 1.55, rise: 0.18 });
  const seats = [];
  for (let row = 1; row <= config.rows; row++) {
    for (let seat = 1; seat <= config.cols; seat++) {
      seats.push(Object.freeze({ id: `${row}-${seat}`, row, seat,
        x: (seat - 7.5) * 0.8, z: 5 + (row - 1) * config.rowGap,
        y: (row - 1) * config.rise, price: row <= 3 ? 350 : 550 }));
    }
  }
  function floorAt(z) {
    return Math.max(0, Math.min(7, Math.floor((z - 3.97) / config.rowGap))) * config.rise;
  }
  function canStand(x, z) {
    const r = config.radius;
    if (Math.abs(x) > config.halfWidth - r || z < config.front + r || z > config.back - r) return false;
    return !seats.some(q => {
      const dx = Math.max(Math.abs(x - q.x) - 0.36, 0);
      const dz = Math.max(Math.abs(z - q.z) - 0.4, 0);
      return dx * dx + dz * dz < r * r;
    });
  }
  function move(position, dx, dz) {
    const count = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.06));
    let { x, z } = position;
    for (let i = 0; i < count; i++) {
      if (canStand(x + dx / count, z)) x += dx / count;
      if (canStand(x, z + dz / count)) z += dz / count;
    }
    return { x, z };
  }
  function direction(yaw, forward, strafe) {
    const magnitude = Math.hypot(forward, strafe) || 1;
    return { x: (-Math.sin(yaw) * forward + Math.cos(yaw) * strafe) / magnitude,
      z: (-Math.cos(yaw) * forward - Math.sin(yaw) * strafe) / magnitude };
  }
  const model = { config, seats, floorAt, canStand, move, direction, get: id => seats.find(q => q.id === id) };
  if (typeof module !== 'undefined') module.exports = model;
  else root.HallModel = model;
})(typeof window === 'undefined' ? globalThis : window);
