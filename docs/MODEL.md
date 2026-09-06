# Hardware model

## Coordinate and scale convention

One world unit represents 100 mm. Y points upward, +X toward the front intake, and +Z toward the removable side panel. The motherboard lies in the XY plane. Rear I/O and the PSU AC face point toward -X. The model is a generic compact ATX desktop, not a replica of a named product.

| Component | Nominal dimensions used | Scope |
| --- | --- | --- |
| ATX motherboard | 244 × 305 × 1.6 mm | Board outline; mounting locations are illustrative |
| M.2 SSD | 80 × 22 mm | 2280 form factor with mounting screw and edge connector |
| DIMM | 133.35 × 31.25 mm | Kingston KVR26N19S8/8 outline; board thickness is a nominal assumption |
| PCIe x16 slot | 89 mm long | Slot outline and retention latch |
| 3.5-inch HDD | 101.6 × 147 × 26.1 mm | External envelope with closed metal cover |
| CPU | 40 × 40 mm package | Generic square LGA example; not a specific socket compatibility claim |

The board, CPU socket, CPU lid, and cooler base share an assembled contact relationship. Rear USB, Ethernet, display, and PSU faces align with the case rear. Memory stands perpendicular to the motherboard, with its contact edge entering the DIMM slot. The GPU PCB is perpendicular to the motherboard, and its shortened edge connector aligns with the PCIe slot. A drive cage supports the HDD.

The video receptacles now mount against an extended rear GPU PCB and pass through a perforated double-slot bracket. They share the graphics card's displacement through the initial 0-35% disassembly range before becoming independent items in the flat inventory. The case omits blank covers in the two occupied expansion positions. USB-A sockets use 12.5 x 5.5 mm openings in a 15 mm-wide, 36 mm-high four-port housing, replacing the oversized 53 mm-wide block. The Ethernet jack has a 16 x 13.5 mm front housing, an 11.8 mm-wide 8P8C opening with a latch cutout, eight contacts and two LED windows. Its base rests on the motherboard face. These connector shapes and mounting details remain generic, not vendor mechanical drawings; the rear-I/O housing depth accommodates the simplified motherboard/case layout.

## Geometry and materials

- Deterministic PCB artwork, traces, vias, silkscreen, capacitors, and small surface-mounted packages.
- Socket frame, retention lever, schematic LGA contacts, CPU substrate, metal lid, and underside pads.
- DIMM memory packages, gold contact edges, slot bodies, and retention clips.
- NH-L9i cooler contact base, 54 fins, two 6 mm nickel-plated copper heat pipes, and mounting details; 95 × 92 × 23 mm without the fan and 37 mm total height with the fan.
- NF-A9x14 CPU fan with nine swept, pitched blades and acceleration-channel details, 92 × 92 × 14 mm frame, 82.5 mm mounting-hole spacing, and recessed corner pads. Other fans retain generic seven-blade profiles; GPU fans use the graphics-card shroud rather than square case-fan frames.
- Graphics-card PCB, edge connector, backplate, fins, heat pipes, twin fan cutouts, auxiliary power socket, and fasteners.
- Separate 24-pin ATX, 8-pin EPS, and seven-pin L-key SATA connectors; differentiated USB, Ethernet, and display openings.
- PSU AC inlet, stateful I/0 rocker, rear grille, modular output ports, screws, and separate standby / case power indicators.
- Chassis tray, standoffs, rear expansion covers, rubber feet, drive rails, and panel fasteners.
- Physical cable bundles connecting PSU branches, HDD power/data, and the front-panel button. Cables are separate from animated teaching flows, follow endpoint visibility, and disappear beyond 35% disassembly.
- Procedural Three.js room environment for metal reflections. All assets are generated locally; no external 3D asset downloads are required.

## Preserved behavior

The 29 selectable component IDs, bilingual content, English default, lessons, diagnostic state machine, and phased animations remain unchanged. Inventory bounds are recomputed from the detailed geometry, so 100% disassembly continues to produce a size-aware flat layout. Mode changes, hidden endpoints, reduced motion, and paused animations retain their previous rules.

## Verification on 2026-09-06

- 23 unit tests passed, including reference-part mesh dimensions and counts, impeller batch compatibility, nominal form factors, rear-face alignment, CPU/cooler contact, video receptacle/PCB contact through initial disassembly, USB and Ethernet opening dimensions, Ethernet latch clearance and contact count, finite pitched-blade geometry, translation coverage, power transitions, flows, and flat layout.
- Production build passed. The existing Vite large-chunk warning remains; the main JS transfer is approximately 240 kB gzip.
- Playwright with local Chrome software WebGL: desktop 1440 × 1000, mobile 390 × 844, plus reduced-motion mode.
- All 29 visible parts have non-overlapping projected bounds at full disassembly on desktop and mobile. No horizontal page overflow; returning to 0% restores all assembled positions.
- Verified off → standby → starting → running, fan and lamp states, paused particles, hidden flow endpoints, manual course stages, and modal keyboard behavior.
- Nonblank canvas pixel checks and screenshots inspected. No page-script errors in the regression run.
- Latest connector regression: 181 draw calls, working automatic rotation, and all 29 flat-layout parts inside the canvas on both viewports. The preceding full simulation regression confirmed zero new frames while idle. These software-renderer measurements do not establish real-phone frame rate or thermal behavior.

## Remaining simplifications

The cooler, CPU fan, and two memory modules now have named hardware references. Their published outer dimensions are tested against generated mesh bounds, not just configuration values. This does not make the entire desktop a 1:1 replica. The motherboard, GPU, PSU, CPU/socket, storage and chassis still have no selected commercial SKU, measured CAD, or vendor layout to reproduce.

See [reference sources and measurement scope](REFERENCES.md) for the distinction between verified dimensions and approximated shapes. Component focus now zooms to the selected geometry for detail inspection. Flow explanations remain outside the canvas. The reference fan uses the published counter-clockwise direction as viewed from the intake; playback speed is illustrative, not an RPM measurement. The cooling airflow now passes through the down-draft fan and heatsink region before leaving the heated-air node.

Board traces, contact counts on fine-pitch interfaces, screw patterns, and component package layouts are visual approximations. The model does not claim electrical netlist accuracy, manufacturing tolerances, connector mating validation, or full ATX mechanical compliance. The closed HDD cover has a stamped circular detail, not an exposed working platter. PSU perforations use dark surface details rather than a modeled internal enclosure. Some peripheral cables and internal semiconductor structures are omitted. Thermal paths remain qualitative conduction / convection diagrams; fan blades are geometry, not an aerodynamic simulation.

For a particular motherboard or commercial chassis, manufacturer drawings, connector specifications, and licensed CAD / glTF assets should replace these generic dimensions and layouts before asserting exact compatibility.
