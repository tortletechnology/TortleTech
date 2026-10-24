export const LAYOUT = {
  bounds: { minX: -5.35, maxX: 5.35, minZ: -1.38, maxZ: 3.5 },
  counter: { z: -2.52, w: 10.9, h: 0.86, d: 1.46 },
  wallZ: -4.42,
  stations: [
    { id: "buns", type: "buns", x: -4.2, z: -1.18 },
    { id: "dogs", type: "dogs", x: -2.5, z: -1.18 },
    { id: "grill", type: "grill", x: -0.15, z: -1.18 },
    { id: "board", type: "board", x: 2.45, z: -1.18 },
    { id: "serve", type: "serve", x: 4.55, z: -1.18 },
    { id: "trash", type: "trash", x: 4.9, z: 2.9 },
  ],
  grillSlots: [-0.96, -0.32, 0.32, 0.96].map((dx) => ({ x: -0.15 + dx, z: -2.22 })),
  mats: [{ x: 2.45, z: -2.22 }],
  customers: [
    { x: 3.65, z: -3.72 },
    { x: 4.55, z: -3.72 },
    { x: 5.25, z: -3.72 },
  ],
  spawn: { x: 0.1, z: 1.35 },
  reach: 1.25,
  trashRadius: 0.56,
  itemY: 1.14,
};
