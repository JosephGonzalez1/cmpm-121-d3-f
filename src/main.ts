// @deno-types="npm:@types/leaflet"
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./_leafletWorkaround.ts";
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
playerMarker.bindTooltip("You are here", { permanent: true }).addTo(map);

// --- Config ---
const TILE_DEGREES = 0.0001;
const INTERACTION_RADIUS = 3;
const TOKEN_LABEL_STYLE = "color: red; font-weight: bold;";
const VICTORY_VALUE = 8;

// --- Cell data ---
interface CellData {
  value: number | null;
  labelMarker?: L.Marker | undefined;
  rect?: L.Rectangle | undefined;
}

// Map to hold persistent cells
const persistentCells = new Map<string, CellData>();

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

// --- Victory display ---
const victoryDiv = document.createElement("div");
victoryDiv.id = "victory";
Object.assign(victoryDiv.style, {
  position: "absolute",
  top: "10px",
  left: "50%",
  transform: "translateX(-50%)",
  padding: "1rem 2rem",
  backgroundColor: "gold",
  fontWeight: "bold",
  fontSize: "1.2rem",
  display: "none",
});
victoryDiv.textContent = "Victory!";
document.body.append(victoryDiv);

// --- Player logical position ---
const playerCell = {
  i: Math.floor(36.997936938057016 / TILE_DEGREES),
  j: Math.floor(-122.05703507501151 / TILE_DEGREES),
};

// --- Helpers ---
const cellKey = (i: number, j: number) => `${i},${j}`;
const cellBounds = (i: number, j: number) =>
  L.latLngBounds([i * TILE_DEGREES, j * TILE_DEGREES], [
    (i + 1) * TILE_DEGREES,
    (j + 1) * TILE_DEGREES,
  ]);
const cellDistance = (i: number, j: number) =>
  Math.max(Math.abs(i - playerCell.i), Math.abs(j - playerCell.j));
const inRange = (i: number, j: number) =>
  cellDistance(i, j) <= INTERACTION_RADIUS;

function generateTokenValue(i: number, j: number): number | null {
  const r = luck(`cell(${i},${j})`);
  if (r >= 0.7 && r < 0.9) return 1;
  if (r >= 0.9 && r < 0.97) return 2;
  if (r >= 0.97) return 4;
  return null;
}

// --- Cell interaction ---
function handleCellClick(i: number, j: number) {
  const key = cellKey(i, j);
  const cell = persistentCells.get(key);
  if (!cell || !inRange(i, j)) return;

  // Pick up token
  if (heldToken === null && cell.value !== null) {
    heldToken = cell.value;
    cell.value = null;
    cell.labelMarker?.remove();
    cell.labelMarker = undefined;
    updateInventoryUI();
    return;
  }

  // Craft token
  if (heldToken !== null && cell.value === heldToken) {
    const newValue = heldToken * 2;
    heldToken = null;

    cell.labelMarker?.remove();

    cell.value = newValue;
    cell.labelMarker = L.marker(cellBounds(i, j).getCenter(), {
      icon: L.divIcon({
        className: "token-label",
        html: `<div style="${TOKEN_LABEL_STYLE}">${newValue}</div>`,
      }),
    }).addTo(map);

    updateInventoryUI();

    if (newValue >= VICTORY_VALUE) victoryDiv.style.display = "block";
  }
}

// --- Draw a single cell ---
function drawCell(i: number, j: number) {
  const key = cellKey(i, j);
  let cell = persistentCells.get(key);

  if (!cell) {
    cell = { value: generateTokenValue(i, j) };
    persistentCells.set(key, cell);
  }

  if (cell.rect) return;

  const bounds = cellBounds(i, j);
  const rect = L.rectangle(bounds, { color: "gray", weight: 1 }).addTo(map);
  rect.on("click", () => handleCellClick(i, j));

  cell.rect = rect;

  if (cell.value !== null) {
    cell.labelMarker = L.marker(bounds.getCenter(), {
      icon: L.divIcon({
        className: "token-label",
        html: `<div style="${TOKEN_LABEL_STYLE}">${cell.value}</div>`,
      }),
    }).addTo(map);
  }
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

  for (const [key, cell] of persistentCells.entries()) {
    if (!newVisible.has(key)) {
      cell.rect?.remove();
      cell.rect = undefined;
      cell.labelMarker?.remove();
      cell.labelMarker = undefined;
    }
  }
}

// --- Initial draw ---
map.on("moveend", updateVisibleCells);
updateVisibleCells();

// --- Player movement buttons ---
const controlPanelDiv = document.createElement("div");
Object.assign(controlPanelDiv.style, {
  padding: "1rem",
  display: "flex",
  gap: "0.5rem",
});
document.body.append(controlPanelDiv);

function movePlayer(di: number, dj: number) {
  playerCell.i += di;
  playerCell.j += dj;

  const newLatLng = L.latLng(
    playerCell.i * TILE_DEGREES + TILE_DEGREES / 2,
    playerCell.j * TILE_DEGREES + TILE_DEGREES / 2,
  );
  playerMarker.setLatLng(newLatLng);
  map.panTo(newLatLng);
  updateVisibleCells();
}

[{ label: "↑", di: 1, dj: 0 }, { label: "↓", di: -1, dj: 0 }, {
  label: "←",
  di: 0,
  dj: -1,
}, { label: "→", di: 0, dj: 1 }]
  .forEach(({ label, di, dj }) => {
    const btn = document.createElement("button");
    btn.textContent = label;
    Object.assign(btn.style, { width: "2rem", height: "2rem" });
    btn.addEventListener("click", () => movePlayer(di, dj));
    controlPanelDiv.append(btn);
  });
