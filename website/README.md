# vrpc.io

The VRPC website, built with [Docusaurus](https://docusaurus.io). Its
documentation is the repository's [docs/](../docs) folder, rendered as it is:
write and fix documentation there, not here. This folder holds only the home
page, the theme and the configuration.

```bash
npm install
npm start          # http://localhost:3000, reloads on changes to ../docs too
npm run build      # into build/; fails on a broken link or anchor
npm run serve      # serves build/
```

## How it fits together

| File | Does |
| --- | --- |
| `docusaurus.config.js` | site, navbar, footer, search; docs come from `../docs` |
| `sidebars.js` | the documentation's navigation; add a new page here |
| `plugins/remark-repo-links.js` | links from docs/ to files elsewhere in the repository (README, changelog, examples) go to GitHub |
| `plugins/doc-text.js` | what the site reads from a page of docs/: its title, its description (the first paragraph - Docusaurus would take the first line), its address |
| `plugins/llms.js`, `llms.md` | after the build: `/llms.txt` and `/llms-full.txt` for AI assistants ([llmstxt.org](https://llmstxt.org)), every page of the documentation as Markdown beside it (`/docs/getting-started.md`), and the README as `/index.md` |
| `src/theme/DocItem/Metadata` | every page of the documentation names its Markdown (`<link rel="alternate" type="text/markdown">`) |
| `src/theme/NotFound/Content` | the 404 page, with the pages a visitor probably looked for |
| `src/pages/index.jsx`, `src/css/home.css` | the home page |
| `src/components/LogoJourney.jsx`, `logo3d.js` | the 3D V: it floats in the hero and settles in the call story as you scroll (three.js, loaded after the page) |
| `src/components/CallStory.jsx` | the animated call between a client and an agent, with its messages on the wire |
| `src/components/LiveDemo.jsx`, `LiveRadar.jsx` | the home page's live demo, a VRPC client in the browser |
| `src/components/GitHubStar.jsx`, `src/theme/NavbarItem/ComponentTypes.js` | the navbar's star button (`custom-githubStar`): live star count, and a thank-you when the visitor comes back from GitHub |
| `src/css/custom.css` | Heisenware's palette and fonts for the whole site |
| `src/clientModules/fonts.js` | Inter and JetBrains Mono, served from vrpc.io itself |
| `static/` | the logo, favicons, language logos, `robots.txt`, the `CNAME` of vrpc.io |

The pages of the documentation work on GitHub as well as here: they link to
each other with relative `.md` paths. `npm run check:links` in the repository
root checks them without building the site.

The API reference in `docs/reference/` is generated from the JSDoc by
`npm run build:doc` in the repository root.

## Deployment

[.github/workflows/deploy-website.yml](../.github/workflows/deploy-website.yml)
builds the site for every pull request that touches `docs/`, `website/` or
the README, and deploys it to GitHub Pages from master. URLs end in `/`
(`trailingSlash: true`): GitHub Pages redirects `/docs/x` there, so both
forms work.
