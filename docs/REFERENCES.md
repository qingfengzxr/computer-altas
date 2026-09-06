# Real-hardware references

Verified on 2026-09-06. Models are independently constructed from public dimensional facts and visual references. No vendor image or third-party CAD mesh is bundled. The application links each referenced component to its manufacturer specification.

## Noctua NH-L9i

Source: https://www.noctua.at/en/products/nh-l9i/specifications

Read the mechanical specifications and compared the manufacturer's product photograph at https://www.noctua.at/en/products/nh-l9i .

Verified: 95 mm width, 92 mm depth, 23 mm heatsink height, 37 mm total height with fan; 54 fins; two 6 mm heat pipes; 40.8 × 40 mm contact base. Base and heat pipes are nickel-plated copper; fins are nickel-plated aluminium. The cooler is for LGA115x / LGA1200.

The mesh has these nominal outer dimensions, contact-base footprint, fin count and pipe diameter. Exact heat-pipe routing, fin thickness/pitch, brackets, surface finish, and mounting-ear profiles are approximated from photographs because no manufacturing drawing was provided. Do not use these meshes to fabricate parts or assert CPU/socket compatibility. The selected CPU and motherboard remain generic.

## Noctua NF-A9x14 HS-PWM

Bundled-fan source: https://www.noctua.at/en/products/nh-l9i/specifications

Shared-frame mechanical source: https://www.noctua.at/en/products/nf-a9x14-pwm/specifications

Verified: 92 × 92 × 14 mm nominal frame, 82.5 × 82.5 mm mounting-hole spacing, beige frame, brown impeller, four-pin PWM connection, counter-clockwise direction. The ordinary retail NF-A9x14 PWM and the bundled HS-PWM have different speed specifications; the tutorial does not display the retail RPM as a specification for the HS variant.

The model tests the full frame envelope and mounting-hole centres. Blade camber, pitch, acceleration channels and motor profile are visual approximations, not scanned aerodynamics. Pads are recessed within the nominal 14 mm envelope; the retail product specification lists 15 mm with protruding anti-vibration pads. The cooler assembly is modeled at its separately published 37 mm total height. Fan screws and cabling are simplified.

## Kingston KVR26N19S8/8

Source: https://www.kingston.com/datasheets/KVR26N19S8_8.pdf

Document VALUERAM1595-001.A00, pages 1–2: 8 GB, DDR4-2666 CL19, 1Rx8, eight 1G × 8-bit FBGA packages; 288 gold contacts; 133.35 mm length and 31.25 mm board height. The source includes front/back diagrams, edge retention notches, key opening and mounting holes.

The model now uses eight packages on the front face, a bare rear face, 144 contacts per face, edge retention notches, and a real through-key opening in the PCB. A raycast verifies that the key is not just painted on. The board uses nominal 1.2 mm thickness, which is an implementation assumption, not a thickness dimension verified in this particular sheet. Chip packages, label artwork, exact plating thickness, key curvature, and contact-edge curvature remain approximate. The same module is used for both memory slots.

## Verification

22 tests pass, including independent expected values for the rendered cooler envelope (95 × 92 × 23 mm), assembled height (37 mm), fan (92 × 92 × 14 mm), mounting holes (82.5 mm), memory outline (133.35 × 31.25 mm), fin/pipe/chip/contact counts and the PCB key opening. Additional connector checks cover GPU receptacle contact and the generic USB-A opening dimensions.

Browser regression covers desktop and mobile flat layouts with 29 non-overlapping projected component bounds; off, standby, startup, pause, hidden endpoints, thermal stages, course completion, reduced motion and keyboard modal behavior. Canvas pixel checks, component close-up screenshots and frame counters are also inspected. Real-phone performance and manufacturing tolerances are not certified.

The rest of the computer still requires a specific bill of materials and manufacturer mechanical drawings or appropriately licensed CAD/scan assets before a complete 1:1 claim is supportable. A file format change from procedural geometry to glTF alone would not establish accuracy.
