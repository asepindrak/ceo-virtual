import { Position3D } from '@/types/office';

// Office world bounds and grid settings (Spacious Expanded Office Layout)
export const GRID_WIDTH = 35; // X: -17 to 17
export const GRID_HEIGHT = 31; // Z: -13 to 17 (includes outdoor promenade & train station)
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

// 0: Walkable, 1: Obstacle (Desk, Wall, Big Furniture)
export function createDefaultCollisionGrid(): number[][] {
  const grid: number[][] = Array.from({ length: GRID_HEIGHT }, () =>
    Array(GRID_WIDTH).fill(0)
  );

  // Outer Office Perimeter Walls (except main entrance doorway at bottom center)
  for (let x = 0; x < GRID_WIDTH; x++) {
    grid[0][x] = 1; // Top Wall (z = -13)
    // Office South Wall at z = 11 (gz = 24), leaving wide doorway at gx = 14..20 (x = -3..+3)
    if (x < 14 || x > 20) {
      grid[24][x] = 1;
    }
    // World South Boundary (z = 17 / gz = 30) along highway curb
    grid[GRID_HEIGHT - 1][x] = 1;
  }
  for (let z = 0; z < GRID_HEIGHT; z++) {
    grid[z][0] = 1; // Left Wall
    grid[z][GRID_WIDTH - 1] = 1; // Right Wall
  }

  // Large Round Conference Table Core in Sprint Station (X: 11.5, Z: 6.0)
  grid[19][28] = 1;
  grid[19][29] = 1;

  // Lead Executive Desk Core (X: 11.5, Z: -7.0)
  grid[6][28] = 1;
  grid[6][29] = 1;

  // Pantry Barista Counter back wall & Refrigerator (X: -15, Z: 3..6)
  grid[17][2] = 1;
  grid[18][2] = 1;

  return grid;
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

// A* Pathfinding Implementation
export function findPath(
  start: Position3D,
  target: Position3D,
  customGrid?: number[][]
): Position3D[] {
  const grid = customGrid || createDefaultCollisionGrid();
  const startGrid = worldToGrid(start.x, start.z);
  let targetGrid = worldToGrid(target.x, target.z);

  // If target cell itself is an obstacle (e.g. inside desk mesh), find adjacent walkable cell
  if (grid[targetGrid.gz]?.[targetGrid.gx] === 1) {
    const neighbors = [
      { gx: targetGrid.gx, gz: targetGrid.gz + 1 },
      { gx: targetGrid.gx, gz: targetGrid.gz - 1 },
      { gx: targetGrid.gx - 1, gz: targetGrid.gz },
      { gx: targetGrid.gx + 1, gz: targetGrid.gz },
    ];
    const walkable = neighbors.find(
      (n) =>
        n.gx >= 0 &&
        n.gx < GRID_WIDTH &&
        n.gz >= 0 &&
        n.gz < GRID_HEIGHT &&
        grid[n.gz][n.gx] === 0
    );
    if (walkable) {
      targetGrid = walkable;
    }
  }

  // Start node
  const openList: PathNode[] = [];
  const closedSet = new Set<string>();

  const startNode: PathNode = {
    gx: startGrid.gx,
    gz: startGrid.gz,
    g: 0,
    h: Math.abs(startGrid.gx - targetGrid.gx) + Math.abs(startGrid.gz - targetGrid.gz),
    f: 0,
  };
  startNode.f = startNode.g + startNode.h;
  openList.push(startNode);

  const getKey = (gx: number, gz: number) => `${gx},${gz}`;

  while (openList.length > 0) {
    // Sort by lowest f score
    openList.sort((a, b) => a.f - b.f);
    const current = openList.shift()!;

    if (current.gx === targetGrid.gx && current.gz === targetGrid.gz) {
      // Reconstruct path
      const path: Position3D[] = [];
      let curr: PathNode | undefined = current;
      while (curr) {
        path.unshift(gridToWorld(curr.gx, curr.gz));
        curr = curr.parent;
      }
      // Ensure target exact position is the final destination
      if (path.length > 0) {
        path[path.length - 1] = { x: target.x, z: target.z };
      }
      return path;
    }

    closedSet.add(getKey(current.gx, current.gz));

    // 4-directional movement (orthogonal)
    const dirs = [
      { dx: 1, dz: 0 },
      { dx: -1, dz: 0 },
      { dx: 0, dz: 1 },
      { dx: 0, dz: -1 },
    ];

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

      const gScore = current.g + 1;
      const hScore = Math.abs(nx - targetGrid.gx) + Math.abs(nz - targetGrid.gz);
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

  // Fallback direct path if trapped
  return [start, target];
}
