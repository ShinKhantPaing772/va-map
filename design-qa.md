# Design QA

- Source visual truth: `/Users/shinkhantpaing/Documents/va-map/figma-full.png`
- Source: Figma Make — Futuristic Live Flight Map
- Implementation screenshot: unavailable
- Intended viewport: 1280 × 720 desktop; 390 × 844 mobile
- State: active live map, with selected-flight and inactivity states also in scope

**Findings**

- [P0] Browser-rendered implementation evidence is unavailable
  - Location: local VA Map preview.
  - Evidence: the Figma reference was captured successfully, but the managed environment rejected permission to bind the local server to port 5173. Direct local-file navigation is also blocked by browser security policy.
  - Impact: layout, typography, map rendering, responsive behavior, primary interactions, and console output cannot be visually compared against the source.
  - Fix: explicitly authorize the local `npm start` server, then capture desktop and mobile states in the in-app browser.

**Required Fidelity Surfaces**

- Fonts and typography: implemented with Inter and DM Mono to match the reference hierarchy; browser verification pending.
- Spacing and layout rhythm: segmented command bar, glass controls, full-screen map, and responsive bottom sheet implemented; browser verification pending.
- Colors and visual tokens: CZVG blue, cyan, green, gold, light map, translucent white surfaces, borders, and shadows mapped to CSS tokens; visual sampling pending.
- Image quality and asset fidelity: no custom raster imagery is required by the reference. Map tiles remain sourced from CARTO/OpenStreetMap, and UI icons use Material Symbols; rendered fidelity pending.
- Copy and content: CZVG identity, Expert Live Map title, live metrics, flight details, tooltip telemetry, and inactivity copy are implemented; browser verification pending.

**Full-view Comparison Evidence**

- Source capture is available at the path above.
- No same-viewport implementation capture is available, so a valid combined comparison could not be produced.

**Focused Region Comparison Evidence**

- Not performed because the implementation could not be opened in the approved browser surface.

**Primary Interactions Pending Browser Test**

- Aircraft selection and close behavior.
- Aircraft tooltip telemetry.
- Zoom in, zoom out, and fit-to-flights controls.
- Five-minute inactivity pause and resume flow.
- Desktop and mobile panel behavior.
- Browser console errors.

**Comparison History**

- Pass 1: blocked before implementation capture; no visual fixes can be validated yet.

**Implementation Checklist**

- Authorize the local server.
- Capture desktop active-map and selected-aircraft states.
- Capture the 390 × 844 mobile state.
- Compare source and implementation together.
- Fix any P0/P1/P2 findings and repeat the comparison.

**Follow-up Polish**

- Deferred until browser-rendered evidence is available.

final result: blocked
