# The research machine

An interactive model of AI research labour, experiment compute and training compute. Change the assumptions to see the resulting pace of progress, or set a target and calculate the labour needed to reach it. The machine diagram and the equations use the same calculation engine.

The starting model comes from [Tejas Subramaniam’s post](https://x.com/TejasReal/status/2118873231872643552). The benchmark context comes from [METR’s assessment of AI’s acceleration of Anthropic’s research](https://metr.org/blog/2026-11-05-anthropic-ai-rd-acceleration-assessment/). The page adds illustrative assumptions and extensions. Its results are conditional calculations, rather than forecasts.

## Run locally

No package installation is needed. With Python 3 installed, run:

```sh
python3 -m http.server 8000 --directory site
```

Open `http://localhost:8000/experiments/research-machine/`. The page also works directly from disk. Navigation and source links open external pages when clicked; the model needs no network connection.

## Test

With Node.js installed, run:

```sh
node --test tests/
```

The suite checks the engine, page integration, exact copy, review exports and offline build. Integration tests use a DOM stand-in; they cannot establish visual quality. Optional rendered checks in `tests/check-page.cjs` require an existing local Playwright installation and browser. Set `BROWSER_EXECUTABLE` if needed. No browser or package is downloaded by this project.

## Build a private review copy

```sh
node scripts/build-review-copy.mjs --reviewer "Name"
```

This creates `dist/research-machine-review.html`, a self-contained offline page with a dated source hash, a private-review banner and a comment tool. Omit `--reviewer` for an unnamed review copy. Open it from disk. The source page has no comment tool. Comments are stored in the browser, or held in memory when browser storage is blocked. Use “Download comments (.md)” to save them and send the file back to Ashish. Nothing is sent automatically. Storage may differ between browsers and file locations.

## Code layout

- `site/assets/`: shared theme script and house styles.
- `site/experiments/research-machine/index.html`: page text and static fallback.
- `engine.js` in that page folder: pure calculations, inverse solutions and time paths.
- `app.js`: controls, diagrams, charts and a read-only state snapshot API.
- `help.js` and `styles.css`: explanations and page styling.
- `review/`: comment tool and its styles, used only in the private build.
- `scripts/build-review-copy.mjs`: dependency-free HTML bundler.
- `tests/`: engine and integration tests, literal copy expectations and optional browser checks. `tests/refresh-fallback.cjs` regenerates static defaults after a rendering change.
- `WHAT-WE-GOT-WRONG.md`: mistakes, how we found them and what we changed.

## Do better

- AI researchers use compute themselves, which the model leaves out.
- Let compute and labour compete for one pool.
- Add endogenous feedback from capability to L, so better AI changes the supply of research labour.
- Estimate rather than assume s, a, σ and β.
- Replace the index bridge b with a measured mapping.
- The model has no calendar. Its time paths show years from a chosen starting point, without predicting dates.

## Licences

Code: [MIT](LICENSE), © 2026 Ashish Kulkarni. Words: [CC BY 4.0](LICENSE-TEXT.md). Third-party source material remains under its publishers’ terms.
