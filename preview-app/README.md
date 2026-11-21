# CarBuy public preview source

This is the source for the black-themed, static [GitHub Pages preview](https://nahid271.github.io/CarBuy_Web/preview/). It contains sample listings only. The real local module prototypes live under `../marketplace/`, `../listings/`, `../dealers/` and the other domain directories. GitHub Pages cannot host their authentication, search, messaging or payment servers.

The preview reads shared price hypotheses, market configuration and bilingual guidance from `../shared/`. It can filter a small sample car set, share sample car links, show illustrative pricing, and store consented demo analytics in the visitor's own browser. `/build-status` is a browser-local planning workbench for the PRD budget, discovery targets, milestones, risks and open questions. It does not send notes or analytics to a server or accept payments.

From the repository root, run `bash scripts/build-public-preview.sh`. The script installs the locked dependencies, builds a static export with `/CarBuy_Web/preview` as the base path, and copies the result to `preview/` for GitHub Pages. Commit and push the resulting `preview/` files with source changes.
