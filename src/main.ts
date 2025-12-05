// @deno-types="npm:@types/leaflet"
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./_leafletWorkaround.ts"; // fixes marker icons
import luck from "./_luck.ts";

// --- 1) Create the map ---
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

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
}).addTo(map);

// --- 2) Draw player marker ---
const playerMarker = L.marker(CLASSROOM);
playerMarker.bindTooltip("You are here", { permanent: true });
playerMarker.addTo(map);

// --- 3) Define grid ---
const TILE_DEGREES = 0.0001;
const GRID_RADIUS = 5; // 11x11 grid
const cellTokens = new Map<string, number | null>(); // store token per cell

function cellKey(i: number, j: number) {
  return `${i},${j}`;
}

function tokenAtCell(i: number, j: number): number | null {
  const key = cellKey(i, j);
  if (cellTokens.has(key)) return cellTokens.get(key)!;

  const r = luck(`cell(${i},${j})`);
  let value: number | null;
  if (r < 0.7) value = null;
  else if (r < 0.9) value = 1;
  else if (r < 0.97) value = 2;
  else value = 4;

  cellTokens.set(key, value);
  return value;
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

// --- 4) Draw grid and show token values ---
for (let i = -GRID_RADIUS; i <= GRID_RADIUS; i++) {
  for (let j = -GRID_RADIUS; j <= GRID_RADIUS; j++) {
    const bounds = cellBounds(i, j);
    const _rect = L.rectangle(bounds, { color: "gray", weight: 1 }).addTo(map);

    const value = tokenAtCell(i, j);
    if (value !== null) {
      const center = bounds.getCenter();
      L.marker(center, {
        icon: L.divIcon({
          className: "token-label",
          html: `<div style="color: red; font-weight: bold;">${value}</div>`,
        }),
      }).addTo(map);
    }
  }
}

// --- 5) Simple inventory display ---
const inventoryDiv = document.createElement("div");
inventoryDiv.id = "inventory";
inventoryDiv.style.padding = "1rem";
inventoryDiv.style.fontWeight = "bold";
inventoryDiv.textContent = "Holding: none";
document.body.append(inventoryDiv);

const _heldToken: number | null = null;
