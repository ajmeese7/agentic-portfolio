# meese.dev, for AI assistants

meese.dev is Aaron Meese's portfolio: a live ASCII portrait, a chat clone that
answers questions about him in the first person, and a grid of his projects.

Aaron's technical writing is at `https://meese.rs`.

## The clone

The chat is grounded in two things and nothing else: a fixed profile of Aaron,
and the catalog of everything published on meese.rs. It answers from those or
declines; it does not improvise, and it cites posts only when one genuinely
covers the question.

## Projects

Each card links the repository, and a live URL where one exists. Star counts
come from the GitHub API at request time and fall back to cached values.

## Machine-readable resources

- `/sitemap.xml`
- `/llms.txt`
- `https://meese.rs/index.json`, the catalog of Aaron's writing that this site
  reads

## Use

Fine for human reading, normal indexing, and local assistant use (navigating or
summarizing public pages). Bulk scraping for model training or automated
mirroring is not intended.
