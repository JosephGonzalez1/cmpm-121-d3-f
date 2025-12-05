// @deno-types="npm:@types/leaflet"
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./_leafletWorkaround.ts"; // keeps default marker icons working

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

// Add OpenStreetMap tiles
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
}).addTo(map);

// --- 2) Draw the player's location ---
const playerMarker = L.marker(CLASSROOM);
playerMarker.bindTooltip("You are here", { permanent: true });
playerMarker.addTo(map);

// --- 3) Draw a rectangle representing one cell ---
const TILE_DEGREES = 0.0001;
function cellBounds(i: number, j: number) {
  return L.latLngBounds(
    [CLASSROOM.lat + i * TILE_DEGREES, CLASSROOM.lng + j * TILE_DEGREES],
    [
      CLASSROOM.lat + (i + 1) * TILE_DEGREES,
      CLASSROOM.lng + (j + 1) * TILE_DEGREES,
    ],
  );
}

// Example single rectangle at (0,0)
L.rectangle(cellBounds(0, 0), { color: "blue", weight: 1 }).addTo(map);

// --- 4) Use loops to draw a grid of cells around the player ---
const GRID_RADIUS = 5; // draws a 11x11 grid (from -5 to 5)
for (let i = -GRID_RADIUS; i <= GRID_RADIUS; i++) {
  for (let j = -GRID_RADIUS; j <= GRID_RADIUS; j++) {
    L.rectangle(cellBounds(i, j), { color: "gray", weight: 1 }).addTo(map);
  }
}
