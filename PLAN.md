# D3: World of Bits

## Game Design Vision

{a few-sentence description of the game mechanics}

## Technologies

- TypeScript for most game code, little to no explicit HTML, and all CSS collected in common `style.css` file
- Deno and Vite for building
- GitHub Actions + GitHub Pages for deployment automation

## Assignments

### D3.a: Core mechanics (token collection and crafting)

Key technical challenge: Can you assemble a map-based user interface using the Leaflet mapping framework?\
Key gameplay challenge: Can players collect and craft tokens from nearby locations to finally make one of sufficiently high value?

#### Steps D3.a

- [x] copy main.ts to reference.ts for future reference
- [x] delete everything in main.ts
- [x] put a basic leaflet map on the screen
- [x] draw the player's location on the map
- [x] draw a rectangle representing one cell on the map
- [x] use loops to draw a whole grid of cells on the map
- [x] uses luck() to deterministically assign tokens to cells
- [x] displays token values visibly on the map using small red labels
- [x] adds a basic inventory UI that currently just shows “Holding: none”
- [x] player can pick up a token if nearby and not already holding one
- [x] label marker is removed when token is picked up
- [x] simple inventory display updates in real time
- [x] crafting: combine equal tokens to create a new token of double value
- [x] token label update when label combined

### D3.b: Globe-spanning Gameplay

#### Steps D3.b

- [x] dynamic, globe-spanning grid
- [x] memoryless cells
- [x] add player movement buttons to move north/south/east/west
- [x] update playerCell
- [x] updated interaction radius
- [x] victory condition when a token reaches a target value

### D3.c: Object persistence

#### Steps D3.c

- [x] separate cell data from visual objects
- [x] Modify drawCell to use persistent state
- [x] Update cell clicks to persist changes
- [x] Update updateVisibleCells
- [x] fix victory screen and make it more smooth
