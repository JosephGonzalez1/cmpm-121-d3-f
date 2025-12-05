// @deno-types="npm:@types/leaflet"
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./_leafletWorkaround.ts"; // fixes marker icons
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

// --- Grid and tokens setup ---
const TILE_DEGREES = 0.0001;
const GRID_RADIUS = 30; // draws a 61x61 grid
const INTERACTION_RADIUS = 3;

interface CellData {
  value: number | null;
  labelMarker?: L.Marker | undefined;
}

const cellTokens = new Map<string, CellData>();
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

// --- Helper functions ---
function cellKey(i: number, j: number) {
  return `${i},${j}`;
}

function cellBounds(i: number, j: number) {
  return L.latLngBounds(
    [CLASSROOM.lat + i * TILE_DEGREES, CLASSROOM.lng + j * TILE_DEGREES],
    [
      CLASSROOM.lat + (i + 1) * TILE_DEGREES,
      CLASSROOM.lng + (j + 1) * TILE_DEGREES,
    ],
  );
}

function cellDistance(i: number, j: number) {
  return Math.max(Math.abs(i), Math.abs(j));
}

function inRange(i: number, j: number) {
  return cellDistance(i, j) <= INTERACTION_RADIUS;
}

// --- Draw grid and assign tokens ---
const TOKEN_LABEL_STYLE = "color: red; font-weight: bold;";

for (let i = -GRID_RADIUS; i <= GRID_RADIUS; i++) {
  for (let j = -GRID_RADIUS; j <= GRID_RADIUS; j++) {
    const key = cellKey(i, j);
    const bounds = cellBounds(i, j);

    // Draw rectangle
    const rect = L.rectangle(bounds, { color: "gray", weight: 1 }).addTo(map);

    // Assign deterministic token
    const r = luck(`cell(${i},${j})`);
    let value: number | null = null;
    if (r >= 0.7 && r < 0.9) value = 1;
    else if (r >= 0.9 && r < 0.97) value = 2;
    else if (r >= 0.97) value = 4;

    // Add marker if token exists
    let marker: L.Marker | undefined;
    if (value !== null) {
      marker = L.marker(bounds.getCenter(), {
        icon: L.divIcon({
          className: "token-label",
          html: `<div style="${TOKEN_LABEL_STYLE}">${value}</div>`,
        }),
      }).addTo(map);
    }

    cellTokens.set(key, { value, labelMarker: marker });

    // Click handler: pick up or craft
    rect.on("click", () => {
      if (!inRange(i, j)) return;

      const cell = cellTokens.get(key)!;

      // Pick up token
      if (heldToken === null && cell.value !== null) {
        heldToken = cell.value;
        cell.value = null;
        if (cell.labelMarker) {
          cell.labelMarker.remove();
          cell.labelMarker = undefined;
        }
        updateInventoryUI();
        return;
      }

      // Craft token
      if (heldToken !== null && cell.value === heldToken) {
        const newValue = heldToken * 2;
        heldToken = null;

        if (cell.labelMarker) {
          cell.labelMarker.remove();
        }

        cell.value = newValue;
        const newMarker = L.marker(bounds.getCenter(), {
          icon: L.divIcon({
            className: "token-label",
            html: `<div style="${TOKEN_LABEL_STYLE}">${newValue}</div>`,
          }),
        }).addTo(map);
        cell.labelMarker = newMarker;

        updateInventoryUI();
        return;
      }
    });
  }
}
