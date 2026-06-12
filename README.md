# Common Humanity Coalition — website

The public website for the [Common Humanity Coalition](https://commonhumanity.us), built
with [Hugo](https://gohugo.io) (extended) and the Hugo Blox research-group theme.

This is a plain Hugo site — there is no R, blogdown, pandoc, or LaTeX in the toolchain.

## Build locally

Requires Hugo **extended, v0.145.0**. To build with Docker (no host install):

```sh
docker run --rm -v "$PWD":/src -w /src hugomods/hugo:exts-0.145.0 hugo --minify
```

Output is written to `public/` (git-ignored). To preview with live reload, swap
`hugo --minify` for `hugo server --bind 0.0.0.0` and publish a port.

## Deploy

Pushing to the `production` branch triggers `.github/workflows/page_deploy.yaml`,
which builds with Hugo extended 0.145.0 and publishes to GitHub Pages. Develop on
`main`, then fast-forward / merge `main` into `production` to ship.

## Incident Database

The coalition's public Incident Database is the site's primary call to action. It is
currently hosted at:

- **https://common-humanity-coalition.github.io/incidents/**

At DNS cutover this will move to **https://incidents.commonhumanity.us**. When that
happens, update the link in two places:

- the `Incident Database` nav item in `config/_default/menus.yaml`
- the Incident Database call-to-action block in `content/_index.md`
