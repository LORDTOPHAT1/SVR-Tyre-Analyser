# SVR Tyre Wear Analyser

**Version:** v1.4.0  
**Platform:** Gran Turismo 7 / PS5  
**League:** SVR Racing — internal tool  
**Concept & direction:** Lord TopHat | **Built with:** Claude (Anthropic)

---

## What it does

A browser-based race analysis tool built for SVR Racing. No install required, no server needed. Open it in any browser on any device.

**Tab 1 — Tyre Wear Analyser**  
Upload PS5 screenshots taken at the pit entry or finish line. The tool reads the tyre wear bars directly from the image for each corner, calculates wear per lap, projects laps to cliff, and flags whether each pit stop was timed correctly. Supports multi-stint races. Exports a formatted report to Discord.

**Tab 2 — Lap Time Analyser**  
Paste GT7 race result data directly from the game. The tool parses stints automatically, detects incidents, calculates cliff pace, and shows a colour-coded lap chart. Also exports to Discord.

Both tabs work together — the wear data from Tab 1 can be overlaid onto Tab 2 to combine pace and tyre life in one view.

---

## File structure

| File | Contents |
|---|---|
| `SVR-Tyre-Analyser.html` | HTML shell, links all other files |
| `svr-styles.css` | All styling |
| `svr-data.js` | Shared constants — tracks, cars, weather codes, tyre data, pixel regions |
| `svr-tyre-analyser.js` | Tab 1 logic — screenshot reading, stint UI, analysis, graph, session save |
| `svr-laptime-analyser.js` | Tab 2 logic — lap time parsing, analysis, chart rendering |

---

## How to use

**Live version (recommended):**  
Visit the GitHub Pages link — no download needed.  
[Link will appear here once GitHub Pages is enabled]

**Run locally:**  
Download all 5 files into the same folder. Open `SVR-Tyre-Analyser.html` in a browser. All files must stay in the same folder for it to work.

---

## Current version — v1.4.0

- Car selector added to Race Settings (9 SVR Season 3 cars)
- Track list expanded to 22 tracks covering all SVR divisions
- Track list is alphabetical with no round numbers, usable by any division
- Rain availability correctly mapped per track
- Session save codes now include selected car
- Backwards compatible with v1.3.x session codes

Full patch notes: [SVR-Tyre-Analyser-Patch-Notes.md](./SVR-Tyre-Analyser-Patch-Notes.md)

---

*For internal SVR Racing use. Broader release planned for a future version.* 


