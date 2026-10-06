import { Position3D } from '@/types/office';

// Office world bounds and grid settings
export const GRID_WIDTH = 26; // X: -13 to 13
export const GRID_HEIGHT = 20; // Z: -10 to 10
export const CELL_SIZE = 1.0;

export const WORLD_OFFSET_X = -13;
export const WORLD_OFFSET_Z = -10;

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

  // Outer Office Perimeter Walls (except doors)
  for (let x = 0; x < GRID_WIDTH; x++) {
    grid[0][x] = 1; // Top Wall
    grid[GRID_HEIGHT - 1][x] = 1; // Bottom Wall
  }
  for (let z = 0; z < GRID_HEIGHT; z++) {
    grid[z][0] = 1; // Left Wall
    grid[z][GRID_WIDTH - 1] = 1; // Right Wall
  }

  // Internal Glass Partition Wall separating Meeting Room (Right side: X >= 18, Z between 1 and 9)
  for (let z = 1; z <= 9; z++) {
    if (z !== 5) { // Doorway at z=5
      grid[z][18] = 1;
    }
  }
  for (let x = 18; x < GRID_WIDTH - 1; x++) {
    grid[9][x] = 1; // Meeting room bottom wall
  }

  // Internal Partition Wall for Pantry / Breakroom (Left side: X <= 7, Z between 12 and 18)
  for (let x = 1; x <= 7; x++) {
    if (x !== 4) { // Doorway at x=4
      grid[12][x] = 1;
    }
  }

  // Meeting Room Conference Table (Center of meeting room: X: 20-22, Z: 3-6)
  for (let z = 3; z <= 6; z++) {
    for (let x = 20; x <= 22; x++) {
      grid[z][x] = 1;
    }
  }

  // Workstation Desks Cluster 1 (Developers / Engineering: X: 8-11, Z: 3-5)
  for (let z = 3; z <= 5; z++) {
    for (let x = 9; x <= 11; x++) {
      grid[z][x] = 1;
    }
  }

  // Workstation Desks Cluster 2 (Design & Content: X: 8-11, Z: 8-10)
  for (let z = 8; z <= 10; z++) {
    for (let x = 9; x <= 11; x++) {
      grid[z][x] = 1;
    }
  }

  // Workstation Desks Cluster 3 (Management & QA: X: 13-15, Z: 3-5)
  for (let z = 3; z <= 5; z++) {
    for (let x = 14; x <= 15; x++) {
      grid[z][x] = 1;
    }
  }

  // Workstation Desks Cluster 4 (Ops & Analytics: X: 13-15, Z: 8-10)
  for (let z = 8; z <= 10; z++) {
    for (let x = 14; x <= 15; x++) {
      grid[z][x] = 1;
    }
  }

  // Pantry Kitchen Counter & Coffee Machine (X: 2-3, Z: 14-16)
  for (let z = 14; z <= 16; z++) {
    grid[z][2] = 1;
    grid[z][3] = 1;
  }

  // Water Dispenser & Plant Pots Obstacles
  grid[2][2] = 1; // Corner Plant
  grid[17][23] = 1; // Corner Plant
  grid[13][6] = 1; // Water Dispenser

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
