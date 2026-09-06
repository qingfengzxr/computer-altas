# Hardware model

## Coordinate and scale convention

One world unit represents 100 mm. Y points upward, +X toward the front intake, and +Z toward the removable side panel. The motherboard lies in the XY plane. Rear I/O and the PSU AC face point toward -X. The model is a generic compact ATX desktop, not a replica of a named product.

| Component | Nominal dimensions used | Scope |
| --- | --- | --- |
| ATX motherboard | 244 × 305 × 1.6 mm | Board outline; mounting locations are illustrative |
| M.2 SSD | 80 × 22 mm | 2280 form factor with mounting screw and edge connector |
| DIMM | 134 mm long | Rounded DIMM length; package and contact pitch are illustrative |
| PCIe x16 slot | 89 mm long | Slot outline and retention latch |
| 3.5-inch HDD | 101.6 × 147 × 26.1 mm | External envelope with closed metal cover |
| CPU | 40 × 40 mm package | Generic square LGA example; not a specific socket compatibility claim |

The board, CPU socket, CPU lid, and cooler base share an assembled contact relationship. Rear USB, Ethernet, display, and PSU faces align with the case rear. Memory stands perpendicular to the motherboard, with its contact edge entering the DIMM slot. The GPU PCB is perpendicular to the motherboard, and its shortened edge connector aligns with the PCIe slot. A drive cage supports the HDD.

## Geometry and materials

- Deterministic PCB artwork, traces, vias, silkscreen, capacitors, and small surface-mounted packages.
- Socket frame, retention lever, schematic LGA contacts, CPU substrate, metal lid, and underside pads.
- DIMM memory packages, gold contact edges, slot bodies, and retention clips.
- Cooler contact base, 32 fins, curved copper heat pipes, and mounting details.
- Seven swept, pitched blades per fan, motor hub, stationary support struts, and mounting screws. GPU fans use the graphics-card shroud rather than square case-fan frames.
- Graphics-card PCB, edge connector, backplate, fins, heat pipes, twin fan cutouts, auxiliary power socket, and fasteners.
- Separate 24-pin ATX, 8-pin EPS, and seven-pin L-key SATA connectors; differentiated USB, Ethernet, and display openings.
- PSU AC inlet, stateful I/0 rocker, rear grille, modular output ports, screws, and separate standby / case power indicators.
- Chassis tray, standoffs, rear expansion covers, rubber feet, drive rails, and panel fasteners.
- Physical cable bundles connecting PSU branches, HDD power/data, and the front-panel button. Cables are separate from animated teaching flows, follow endpoint visibility, and disappear beyond 35% disassembly.
- Procedural Three.js room environment for metal reflections. All assets are generated locally; no external 3D asset downloads are required.

## Preserved behavior

The 29 selectable component IDs, bilingual content, English default, lessons, diagnostic state machine, and phased animations remain unchanged. Inventory bounds are recomputed from the detailed geometry, so 100% disassembly continues to produce a size-aware flat layout. Mode changes, hidden endpoints, reduced motion, and paused animations retain their previous rules.

## Verification on 2026-09-06

- 17 unit tests passed, including nominal form factors, rear-face alignment, CPU/cooler contact, finite pitched-blade geometry, translation coverage, power transitions, flows, and flat layout.
- Production build passed. The existing Vite large-chunk warning remains; the main JS transfer is approximately 240 kB gzip.
- Playwright with local Chrome software WebGL: desktop 1440 × 1000, mobile 390 × 844, plus reduced-motion mode.
- All 29 visible parts have non-overlapping projected bounds at full disassembly on desktop and mobile. No horizontal page overflow; returning to 0% restores all assembled positions.
- Verified off → standby → starting → running, fan and lamp states, paused particles, hidden flow endpoints, manual course stages, and modal keyboard behavior.
- Nonblank canvas pixel checks and screenshots inspected. No page-script errors in the regression run.
- Assembled view: approximately 58,910 triangles and 177 draw calls; idle scene adds zero frames over the sampled interval. These software-renderer measurements do not establish real-phone frame rate or thermal behavior.

## Remaining simplifications

Board traces, contact counts on fine-pitch interfaces, screw patterns, and component package layouts are visual approximations. The model does not claim electrical netlist accuracy, manufacturing tolerances, connector mating validation, or full ATX mechanical compliance. The closed HDD cover has a stamped circular detail, not an exposed working platter. PSU perforations use dark surface details rather than a modeled internal enclosure. Some peripheral cables and internal semiconductor structures are omitted. Thermal paths remain qualitative conduction / convection diagrams; fan blades are geometry, not an aerodynamic simulation.

For a particular motherboard or commercial chassis, manufacturer drawings, connector specifications, and licensed CAD / glTF assets should replace these generic dimensions and layouts before asserting exact compatibility.
