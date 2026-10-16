import { Position3D } from '@/types/office';

// Office world bounds and grid settings (Spacious Expanded Office Layout)
export const GRID_WIDTH = 35; // X: -17 to 17 (gx: 0 to 34)
export const GRID_HEIGHT = 31; // Z: -13 to 17 (gz: 0 to 30, includes outdoor promenade & train station)
export const CELL_SIZE = 1.0;

export const WORLD_OFFSET_X = -17;
export const WORLD_OFFSET_Z = -13;

export function worldToGrid(x: number, z: number): { gx: number; gz: number } {
  const gx = Math.round(x - WORLD_OFFSET_X);
  const gz = Math.round(z - WORLD_OFFSET_Z);
  return {
    gx: Math.max(0, Math.min(GRID_WIDTH - 1, gx)),
    gz: Math.max(0, Math.min(GRID_HEIGHT - 1, gz)),
  };
}

export function gridToWorld(gx: number, gz: number): Position3D {
  return {
    x: gx + WORLD_OFFSET_X,
    z: gz + WORLD_OFFSET_Z,
  };
}

/**
 * 0: Walkable, 1: Obstacle (Wall, Glass Partition, Core Furniture)
 * Matches the actual architectural layout rendered in IsometricOffice.tsx
 */
export function createDefaultCollisionGrid(): number[][] {
  const grid: number[][] = Array.from({ length: GRID_HEIGHT }, () =>
    Array(GRID_WIDTH).fill(0)
  );

  // 1. World Perimeter Boundaries
  for (let x = 0; x < GRID_WIDTH; x++) {
    grid[0][x] = 1; // North World Void (z = -13)
    grid[GRID_HEIGHT - 1][x] = 1; // South Highway Curb (z = 17)
  }
  for (let z = 0; z < GRID_HEIGHT; z++) {
    grid[z][0] = 1; // West World Void (x = -17)
    grid[z][GRID_WIDTH - 1] = 1; // East World Void (x = 17)
  }

  // 2. Main Office Physical Perimeter Walls (X: -16.5 to 16.5, Z: -12.0 to 12.0)
  // North Wall (Back Panoramic Glass at z = -12 / gz = 1)
  for (let x = 1; x <= 33; x++) {
    grid[1][x] = 1;
  }
  // West Wall (Left Exterior Wall at x = -16.5 / gx = 1)
  for (let z = 1; z <= 25; z++) {
    grid[z][1] = 1;
  }
  // East Wall (Right Exterior Wall at x = 16.5 / gx = 33)
  for (let z = 1; z <= 25; z++) {
    grid[z][33] = 1;
  }
  // South Wall (Office Front Wall at z = 12 / gz = 25)
  // Left Wing (x = -16 to -5 / gx = 1..12)
  for (let x = 1; x <= 12; x++) {
    grid[25][x] = 1;
  }
  // Right Wing (x = 5 to 16 / gx = 22..33)
  for (let x = 22; x <= 33; x++) {
    grid[25][x] = 1;
  }
  // Central Entrance Doorway (gx = 13..21 / x = -4..+4) is kept 0 (open for travel missions/entrance)

  // 3. Outdoor Side Promenade Barriers (prevents wandering off the lawn)
  for (let z = 26; z <= 29; z++) {
    grid[z][1] = 1;
    grid[z][2] = 1;
    grid[z][31] = 1;
    grid[z][32] = 1;
  }

  // 4. Architectural Internal Partition Walls
  // A. Cafe Slatted Wood Partition Wall (X = -7.2 / gx = 10, Z = 0.8..8.5 / gz = 14..22)
  // Doorway opening at z = 3.6..5.4 (gz = 17..18)
  for (let z = 14; z <= 22; z++) {
    if (z !== 17 && z !== 18) {
      grid[z][10] = 1;
    }
  }

  // B. Lead Executive Suite Partition Wall (X = 6.8 / gx = 24, Z = -11.5..-1.2 / gz = 2..12)
  // Doorway walkthrough opening at z = -7.2..-3.8 (gz = 6..9)
  for (let z = 2; z <= 12; z++) {
    if (z < 6 || z > 9) {
      grid[z][24] = 1;
    }
  }

  // C. Sprint Station Glass Balustrade Wall
  // Top glass partition (Z = 0.5 / gz = 14, X = 6.8..16.2 / gx = 24..33)
  for (let x = 24; x <= 33; x++) {
    grid[14][x] = 1;
  }
  // Left glass partition (X = 6.8 / gx = 24, Z = 0.5..11.8 / gz = 14..24)
  // Doorway walkthrough opening at z = 2.0..3.5 (gz = 15..16)
  for (let z = 14; z <= 24; z++) {
    if (z !== 15 && z !== 16) {
      grid[z][24] = 1;
    }
  }

  // 5. Furniture Core Obstacles (tables/cabinets that agents cannot step on)
  // Conference Table core in Sprint Station (X: 11.5, Z: 6.0 / gx = 28..29, gz = 19)
  grid[19][28] = 1;
  grid[19][29] = 1;

  // Refrigerator & Chiller back wall in Pantry (X: -15, Z: 2.5..4.5 / gx = 2, gz = 15..17)
  grid[15][2] = 1;
  grid[16][2] = 1;
  grid[17][2] = 1;

  // Espresso Machine & Coffee Counter back (X: -11.8, Z: 5.5 / gx = 5, gz = 19)
  grid[19][5] = 1;

  // Arcade Cabinet back in Lounge (X: -8.8, Z: -3.8 / gx = 8, gz = 9)
  grid[9][8] = 1;

  return grid;
}

/**
 * Breadth-first spiral search to find the closest walkable cell
 * if a start or target position is placed inside a mesh or wall
 */
export function findNearestWalkable(
  grid: number[][],
  gx: number,
  gz: number,
  maxRadius = 6
): { gx: number; gz: number } {
  const clampedGx = Math.max(0, Math.min(GRID_WIDTH - 1, gx));
  const clampedGz = Math.max(0, Math.min(GRID_HEIGHT - 1, gz));

  if (grid[clampedGz]?.[clampedGx] === 0) {
    return { gx: clampedGx, gz: clampedGz };
  }

  for (let r = 1; r <= maxRadius; r++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
        const nx = clampedGx + dx;
        const nz = clampedGz + dz;
        if (
          nx >= 0 &&
          nx < GRID_WIDTH &&
          nz >= 0 &&
          nz < GRID_HEIGHT &&
          grid[nz][nx] === 0
        ) {
          return { gx: nx, gz: nz };
        }
      }
    }
  }

  return { gx: clampedGx, gz: clampedGz };
}

// Node for A* Search
interface PathNode {
  gx: number;
  gz: number;
  g: number;
  h: number;
  f: number;
  parent?: PathNode;
}

/**
 * Raycast Line-of-Sight check using Bresenham algorithm.
 * Checks whether an agent can walk in a direct straight line between two points
 * without penetrating any obstacle cell.
 */
function isLineWalkable(
  grid: number[][],
  p1: { gx: number; gz: number },
  p2: { gx: number; gz: number }
): boolean {
  let x0 = p1.gx;
  let z0 = p1.gz;
  const x1 = p2.gx;
  const z1 = p2.gz;

  const dx = Math.abs(x1 - x0);
  const dz = Math.abs(z1 - z0);
  const sx = x0 < x1 ? 1 : -1;
  const sz = z0 < z1 ? 1 : -1;
  let err = dx - dz;

  while (true) {
    if (grid[z0]?.[x0] === 1) {
      return false;
    }
    if (x0 === x1 && z0 === z1) {
      break;
    }
    const e2 = 2 * err;
    if (e2 > -dz) {
      err -= dz;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      z0 += sz;
    }
  }

  return true;
}

/**
 * Smooths A* path using string-pulling line-of-sight shortcutting.
 * Removes unnecessary 90-degree zig-zags and staircases.
 */
function smoothPath(path: Position3D[], grid: number[][]): Position3D[] {
  if (path.length <= 2) return path;

  const smoothed: Position3D[] = [path[0]];
  let currentIndex = 0;

  while (currentIndex < path.length - 1) {
    let furthest = currentIndex + 1;
    for (let test = path.length - 1; test > currentIndex + 1; test--) {
      const gCurrent = worldToGrid(path[currentIndex].x, path[currentIndex].z);
      const gTest = worldToGrid(path[test].x, path[test].z);
      if (isLineWalkable(grid, gCurrent, gTest)) {
        furthest = test;
        break;
      }
    }
    smoothed.push(path[furthest]);
    currentIndex = furthest;
  }

  return smoothed;
}

/**
 * High-performance A* Pathfinding with Line-of-Sight smoothing,
 * strict office interior isolation, and diagonal avoidance of wall-clipping.
 */
export function findPath(
  start: Position3D,
  target: Position3D,
  customGrid?: number[][]
): Position3D[] {
  // 1. Create base collision grid
  const rawGrid = customGrid || createDefaultCollisionGrid();
  // Deep clone row array to avoid mutating global reference when applying indoor locks
  const grid: number[][] = rawGrid.map((row) => [...row]);

  // 2. CRITICAL OFFICE ENTRANCE LOCK:
  // If BOTH start and target are inside the office premises (z <= 11.5),
  // lock the south entrance doorway so indoor agents NEVER step outside into the street!
  const isStartIndoor = start.z <= 11.5;
  const isTargetIndoor = target.z <= 11.5;
  if (isStartIndoor && isTargetIndoor) {
    // Block doorway row gz = 25 (x = -4..+4 / gx = 13..21)
    for (let gx = 13; gx <= 21; gx++) {
      grid[25][gx] = 1;
    }
  }

  // 3. Find closest guaranteed walkable grid nodes for start & target
  const rawStartGrid = worldToGrid(start.x, start.z);
  const rawTargetGrid = worldToGrid(target.x, target.z);

  const startGrid = findNearestWalkable(grid, rawStartGrid.gx, rawStartGrid.gz);
  const targetGrid = findNearestWalkable(grid, rawTargetGrid.gx, rawTargetGrid.gz);

  // If already at destination
  if (startGrid.gx === targetGrid.gx && startGrid.gz === targetGrid.gz) {
    return [start, target];
  }

  // 4. Initialize A* open and closed sets
  const openList: PathNode[] = [];
  const closedSet = new Set<string>();
  let closestVisitedNode: PathNode | null = null;

  const heuristic = (gx: number, gz: number) => {
    // Diagonal distance (Chebyshev / Octile heuristic)
    const dx = Math.abs(gx - targetGrid.gx);
    const dz = Math.abs(gz - targetGrid.gz);
    return Math.max(dx, dz) + 0.414 * Math.min(dx, dz);
  };

  const startNode: PathNode = {
    gx: startGrid.gx,
    gz: startGrid.gz,
    g: 0,
    h: heuristic(startGrid.gx, startGrid.gz),
    f: 0,
  };
  startNode.f = startNode.g + startNode.h;
  openList.push(startNode);
  closestVisitedNode = startNode;

  const getKey = (gx: number, gz: number) => `${gx},${gz}`;

  // 8-directional movement (orthogonal + diagonals)
  const dirs = [
    { dx: 1, dz: 0, cost: 1.0 },
    { dx: -1, dz: 0, cost: 1.0 },
    { dx: 0, dz: 1, cost: 1.0 },
    { dx: 0, dz: -1, cost: 1.0 },
    // Diagonals
    { dx: 1, dz: 1, cost: 1.414 },
    { dx: -1, dz: 1, cost: 1.414 },
    { dx: 1, dz: -1, cost: 1.414 },
    { dx: -1, dz: -1, cost: 1.414 },
  ];

  let iterations = 0;
  const maxIterations = 2000;

  while (openList.length > 0 && iterations++ < maxIterations) {
    // Pick node with lowest f
    openList.sort((a, b) => a.f - b.f);
    const current = openList.shift()!;

    // Track best node in case target is temporarily unreachable
    if (!closestVisitedNode || current.h < closestVisitedNode.h) {
      closestVisitedNode = current;
    }

    // Goal reached!
    if (current.gx === targetGrid.gx && current.gz === targetGrid.gz) {
      const rawPath: Position3D[] = [];
      let curr: PathNode | undefined = current;
      while (curr) {
        rawPath.unshift(gridToWorld(curr.gx, curr.gz));
        curr = curr.parent;
      }

      // Smooth path with line-of-sight raycasts
      const smoothed = smoothPath(rawPath, grid);

      // Ensure exact start and target positions bookend the waypoints
      if (smoothed.length > 0) {
        smoothed[0] = { x: start.x, z: start.z };
        smoothed[smoothed.length - 1] = { x: target.x, z: target.z };
      }
      return smoothed;
    }

    closedSet.add(getKey(current.gx, current.gz));

    for (const d of dirs) {
      const nx = current.gx + d.dx;
      const nz = current.gz + d.dz;

      if (
        nx < 0 ||
        nx >= GRID_WIDTH ||
        nz < 0 ||
        nz >= GRID_HEIGHT ||
        grid[nz][nx] === 1 ||
        closedSet.has(getKey(nx, nz))
      ) {
        continue;
      }

      // Corner-cutting prevention: When moving diagonally, both orthogonal cells must be clear!
      if (d.dx !== 0 && d.dz !== 0) {
        if (grid[current.gz][current.gx + d.dx] === 1 || grid[current.gz + d.dz][current.gx] === 1) {
          continue;
        }
      }

      const gScore = current.g + d.cost;
      const hScore = heuristic(nx, nz);
      const existing = openList.find((n) => n.gx === nx && n.gz === nz);

      if (!existing) {
        const neighborNode: PathNode = {
          gx: nx,
          gz: nz,
          g: gScore,
          h: hScore,
          f: gScore + hScore,
          parent: current,
        };
        openList.push(neighborNode);
      } else if (gScore < existing.g) {
        existing.g = gScore;
        existing.f = gScore + existing.h;
        existing.parent = current;
      }
    }
  }

  // Safe fallback: NEVER return a 2-point wall-clipping line!
  // Reconstruct path to the closest reachable node visited by A*
  if (closestVisitedNode && closestVisitedNode !== startNode) {
    const fallbackPath: Position3D[] = [];
    let curr: PathNode | undefined = closestVisitedNode;
    while (curr) {
      fallbackPath.unshift(gridToWorld(curr.gx, curr.gz));
      curr = curr.parent;
    }
    const smoothed = smoothPath(fallbackPath, grid);
    if (smoothed.length > 0) {
      smoothed[0] = { x: start.x, z: start.z };
    }
    return smoothed;
  }

  // If completely immobile, stay at start
  return [start];
}
