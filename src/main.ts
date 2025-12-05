// @deno-types="npm:@types/leaflet"
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./_leafletWorkaround.ts"; // keeps default marker icons working
import luck from "./_luck.ts";

// --- Map setup ---
const mapDiv = document.createElement("div");
mapDiv.id = "map";
mapDiv.style.width = "100%";
mapDiv.style.height = "80vh";
document.body.append(mapDiv);

const CLASSROOM = L.latLng(36.997936938057016, -122.05703507501151);

const map = L.map(mapDiv, {
  center: CLASSROOM,
  zoom: 19,
  zoomControl: false,
  scrollWheelZoom: false,
});

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 })
  .addTo(map);

// --- Player marker ---
const playerMarker = L.marker(CLASSROOM);
playerMarker.bindTooltip("You are here", { permanent: true });
playerMarker.addTo(map);

// --- Grid / token setup ---
const TILE_DEGREES = 0.0001;
const INTERACTION_RADIUS = 3;
const TOKEN_LABEL_STYLE = "color: red; font-weight: bold;";

interface CellData {
  value: number | null;
  labelMarker: L.Marker | undefined; // explicitly allow undefined
  rect: L.Rectangle | undefined; // explicitly allow undefined
}

// Only track currently visible cells
const visibleMarkers = new Map<string, CellData>();

let heldToken: number | null = null;

// --- Inventory UI ---
const inventoryDiv = document.createElement("div");
inventoryDiv.id = "inventory";
inventoryDiv.style.padding = "1rem";
inventoryDiv.style.fontWeight = "bold";
inventoryDiv.textContent = "Holding: none";
document.body.append(inventoryDiv);

function updateInventoryUI() {
  inventoryDiv.textContent = heldToken === null
    ? "Holding: none"
    : `Holding: ${heldToken}`;
}

// --- Player logical position ---
const playerCell = {
  i: Math.floor(CLASSROOM.lat / TILE_DEGREES),
  j: Math.floor(CLASSROOM.lng / TILE_DEGREES),
};

// --- Helper functions ---
function cellKey(i: number, j: number) {
  return `${i},${j}`;
}

function cellBounds(i: number, j: number) {
  return L.latLngBounds(
    [i * TILE_DEGREES, j * TILE_DEGREES],
    [(i + 1) * TILE_DEGREES, (j + 1) * TILE_DEGREES],
  );
}

function cellDistance(i: number, j: number, playerI: number, playerJ: number) {
  return Math.max(Math.abs(i - playerI), Math.abs(j - playerJ));
}

function inRange(i: number, j: number, playerI: number, playerJ: number) {
  return cellDistance(i, j, playerI, playerJ) <= INTERACTION_RADIUS;
}

function generateTokenValue(i: number, j: number): number | null {
  const r = luck(`cell(${i},${j})`);
  if (r >= 0.7 && r < 0.9) return 1;
  if (r >= 0.9 && r < 0.97) return 2;
  if (r >= 0.97) return 4;
  return null;
}

// --- Handle cell clicks (memoryless) ---
function handleCellClick(i: number, j: number) {
  const key = cellKey(i, j);
  const cell = visibleMarkers.get(key);
  if (!cell) return;
  if (!inRange(i, j, playerCell.i, playerCell.j)) return;

  // Pick up token
  if (heldToken === null && cell.value !== null) {
    heldToken = cell.value;
    if (cell.labelMarker) cell.labelMarker.remove();
    cell.value = null;
    cell.labelMarker = undefined;
    updateInventoryUI();
    return;
  }

  // Craft token
  if (heldToken !== null && cell.value === heldToken) {
    const newValue = heldToken * 2;
    heldToken = null;

    if (cell.labelMarker) cell.labelMarker.remove();

    cell.value = newValue;
    cell.labelMarker = L.marker(cellBounds(i, j).getCenter(), {
      icon: L.divIcon({
        className: "token-label",
        html: `<div style="${TOKEN_LABEL_STYLE}">${newValue}</div>`,
      }),
    }).addTo(map);

    updateInventoryUI();
  }
}

// --- Draw a single cell ---
function drawCell(i: number, j: number) {
  const key = cellKey(i, j);
  if (visibleMarkers.has(key)) return; // already drawn

  const bounds = cellBounds(i, j);
  const rect = L.rectangle(bounds, { color: "gray", weight: 1 }).addTo(map);
  rect.on("click", () => handleCellClick(i, j));

  const value = generateTokenValue(i, j);
  const marker = value !== null
    ? L.marker(bounds.getCenter(), {
      icon: L.divIcon({
        className: "token-label",
        html: `<div style="${TOKEN_LABEL_STYLE}">${value}</div>`,
      }),
    }).addTo(map)
    : undefined;

  visibleMarkers.set(key, { value, rect, labelMarker: marker });
}

// --- Update visible cells dynamically ---
function updateVisibleCells() {
  const bounds = map.getBounds();
  const topLeft = {
    i: Math.floor(bounds.getNorth() / TILE_DEGREES),
    j: Math.floor(bounds.getWest() / TILE_DEGREES),
  };
  const bottomRight = {
    i: Math.floor(bounds.getSouth() / TILE_DEGREES),
    j: Math.floor(bounds.getEast() / TILE_DEGREES),
  };

  const newVisible = new Set<string>();
  for (let i = bottomRight.i; i <= topLeft.i; i++) {
    for (let j = topLeft.j; j <= bottomRight.j; j++) {
      drawCell(i, j);
      newVisible.add(cellKey(i, j));
    }
  }

  // Remove off-screen cells (memoryless)
  for (const [key, cell] of visibleMarkers.entries()) {
    if (!newVisible.has(key)) {
      if (cell.labelMarker) cell.labelMarker.remove();
      if (cell.rect) cell.rect.remove();
      visibleMarkers.delete(key);
    }
  }
}

// --- Initial draw ---
map.on("moveend", updateVisibleCells);
updateVisibleCells();
