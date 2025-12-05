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

const map = L.map(mapDiv, {
  center: [36.997936938057016, -122.05703507501151],
  zoom: 19,
  zoomControl: false,
  scrollWheelZoom: false,
});

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 })
  .addTo(map);

// --- Player marker ---
const playerMarker = L.marker([36.997936938057016, -122.05703507501151]);
playerMarker.bindTooltip("You are here", { permanent: true });
playerMarker.addTo(map);

// --- Grid / token setup ---
const TILE_DEGREES = 0.0001;
const INTERACTION_RADIUS = 3;
const TOKEN_LABEL_STYLE = "color: red; font-weight: bold;";
const VICTORY_TARGET = 8; // token value to win

interface CellData {
  value: number | null;
  labelMarker: L.Marker | undefined;
  cellRect: L.Rectangle | undefined;
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
  i: Math.floor(36.997936938057016 / TILE_DEGREES),
  j: Math.floor(-122.05703507501151 / TILE_DEGREES),
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

// --- Helper: create token marker ---
function createTokenMarker(i: number, j: number, value: number) {
  return L.marker(cellBounds(i, j).getCenter(), {
    icon: L.divIcon({
      className: "token-label",
      html: `<div style="${TOKEN_LABEL_STYLE}">${value}</div>`,
    }),
  }).addTo(map);
}

// --- Handle cell clicks (memoryless) ---
function handleCellClick(i: number, j: number) {
  const key = cellKey(i, j);
  const cellData = visibleMarkers.get(key);
  if (!cellData) return;
  if (!inRange(i, j, playerCell.i, playerCell.j)) return;

  // Pick up token
  if (heldToken === null && cellData.value !== null) {
    heldToken = cellData.value;
    if (cellData.labelMarker) cellData.labelMarker.remove();
    cellData.value = null;
    cellData.labelMarker = undefined;
    updateInventoryUI();
    return;
  }

  // Craft token
  if (heldToken !== null && cellData.value === heldToken) {
    const newValue = heldToken * 2;
    heldToken = null;

    if (cellData.labelMarker) cellData.labelMarker.remove();

    cellData.value = newValue;
    cellData.labelMarker = createTokenMarker(i, j, newValue);

    updateInventoryUI();

    // Victory check
    if (newValue >= VICTORY_TARGET) {
      alert(`Victory! You crafted a token of value ${newValue}!`);
    }

    return;
  }
}

// --- Draw a single cell ---
function drawCell(i: number, j: number) {
  const key = cellKey(i, j);
  if (visibleMarkers.has(key)) return;

  const bounds = cellBounds(i, j);
  const cellRect = L.rectangle(bounds, { color: "gray", weight: 1 }).addTo(map);
  cellRect.on("click", () => handleCellClick(i, j));

  const value = generateTokenValue(i, j);
  const marker = value !== null ? createTokenMarker(i, j, value) : undefined;

  visibleMarkers.set(key, { value, cellRect, labelMarker: marker });
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

  // Remove off-screen cells
  for (const [key, cellData] of visibleMarkers.entries()) {
    if (!newVisible.has(key)) {
      if (cellData.labelMarker) cellData.labelMarker.remove();
      if (cellData.cellRect) cellData.cellRect.remove();
      visibleMarkers.delete(key);
    }
  }
}

// --- Initial draw ---
map.on("moveend", updateVisibleCells);
updateVisibleCells();

// --- Player movement buttons ---
const controlPanelDiv = document.createElement("div");
controlPanelDiv.id = "controlPanel";
controlPanelDiv.style.padding = "1rem";
controlPanelDiv.style.display = "flex";
controlPanelDiv.style.gap = "0.5rem";
document.body.append(controlPanelDiv);

function movePlayer(di: number, dj: number) {
  playerCell.i += di;
  playerCell.j += dj;

  const newLat = playerCell.i * TILE_DEGREES + TILE_DEGREES / 2;
  const newLng = playerCell.j * TILE_DEGREES + TILE_DEGREES / 2;
  const newLatLng = L.latLng(newLat, newLng);

  playerMarker.setLatLng(newLatLng);
  map.panTo(newLatLng);
  updateVisibleCells();
}

const directions = [
  { label: "↑", di: 1, dj: 0 },
  { label: "↓", di: -1, dj: 0 },
  { label: "←", di: 0, dj: -1 },
  { label: "→", di: 0, dj: 1 },
];

directions.forEach(({ label, di, dj }) => {
  const btn = document.createElement("button");
  btn.textContent = label;
  btn.style.width = "2rem";
  btn.style.height = "2rem";
  btn.addEventListener("click", () => movePlayer(di, dj));
  controlPanelDiv.append(btn);
});
