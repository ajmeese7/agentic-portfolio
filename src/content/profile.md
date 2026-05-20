# Aaron Meese

## Snapshot
- Name: Aaron Meese
- Based in: Baltimore, Maryland
- Military family, eight zip codes before high school
- Online: [GitHub](https://github.com/ajmeese7), [Twitter](https://twitter.com/ajmeese7), [LinkedIn](https://linkedin.com/in/aaronmeese), [Medium](https://medium.com/@ajmeese7), [Stack Overflow](https://stackoverflow.com/users/6456163/aaron-meese)
- Direct email: [aaron@meese.dev](mailto:aaron@meese.dev)
- Consulting: [meese.enterprises](https://meese.enterprises)

## Story
Got hooked on computers at 10 on my dad's old Windows XP laptop (20 GB HDD, a real artifact); fell down the space rabbit hole on YouTube around the same time, which is still where my brain reaches when it wants to be boggled. Web design was the first part that stuck, competed in TSA "Webmaster" at the state level in high school, never won, learned a ton. Summer after sophomore year I got into Stanford Summer Session and met Java; junior year I joined FIRST robotics; senior year I was team captain of FRC 6489 and we earned a spot on the top alliance at Red Stick Rumble as the defensive bot. Shipped a first real app called Coupon Booked, a 2-year Cordova slog that grossed $2.99 and lost money once you counted the domain plus absurdly overpriced GoDaddy hosting. Pre-AI trial by fire, formative in the way only a public failure can be.

Out of high school I was college-bound to LA Tech (out-of-state schools didn't pencil out on scholarship math). Got a cold call from an Army recruiter while I was at CrossFit with my mom, having just watched Mr. Robot, and jumped at the chance to learn how to hack and get a clearance. Enlisted 2019, started as a Cryptologic Network Warfare Specialist, reclassified to Signals Intelligence Analyst when that MOS was retired, separated in 2024. From there I went into a small cybersecurity startup as Product Owner; that role wrapped in May 2026 when the whole team got laid off after expected funding didn't come through.

## Current status
Between roles as of May 2026 and actively open to the next thing. The previous gig was Product Owner at a small, stealth-mode cybersecurity startup; Kubernetes, Rust, Go, graph-backed data, lots of container work. I can talk about the tech and the product shape; the company name and customers are off-limits. Day-to-day was inheriting a clusterfuck of code, gutting the Docker layout, and single-handedly migrating ~30 containers to Kubernetes while pushing toward something production-ready (if such a thing exists).

If you have an offer or want to talk about a role, the fastest line is [aaron@meese.dev](mailto:aaron@meese.dev). For project work, contracts, or builds, [Meese Enterprises](https://meese.enterprises) is the right door.

## Meese Enterprises
Personal consulting outfit at [meese.enterprises](https://meese.enterprises). The right path for contract work, project inquiries, software builds, websites, cybersecurity and software projects, and supplying or managing engineering contractor labor. Anyone trying to hire me or work together should go through there.

## Projects
- **readme-ascii.** Text-to-ASCII-art generator for GitHub READMEs; the banner on this site uses the same idea. It's my most-starred GitHub repo, so I circled back to make it actually feel good to use. The original version spun up Puppeteer to scrape another generator's site for images, because I didn't yet know enough to realize I could call the underlying library (figlet.js) directly. Rebuilt around figlet.js with live preview, more fonts, persistent form state, and a fully client-side pipeline.
- **termblog.** Self-hosted, terminal-themed blogging platform in Go. Honest take: not sure what it'll become; I had an idea, got overzealous, ended up running it in production as an experiment. The reason it stays interesting is the TUI + WASM space; lots I'd like to explore there when I have the bandwidth.
- **Site avatar (GLSL postprocess pass).** The ASCII avatar on this page is rendered through a custom GLSL postprocess pass. I reverse-engineered the concept from another engineer's site (credited in the repo README) and reworked it to plug into my own, more efficient avatar pipeline. I have almost zero Blender or 3D experience, so a lot of this was riding AI tooling plus stubbornness; want to push it further when time allows.
- **MeeseOS.** Personal-site build on top of the [OS.js](https://github.com/os-js/OS.js) framework. I contributed enough upstream that the maintainer, [Anders Evenrud](https://github.com/andersevenrud), promoted me to a member of the [GitHub org](https://github.com/os-js), the only other person with that access. Neat experience; want to circle back when there's time.
- **local LLM work.** Practical local model use, tooling, and infrastructure. Less "AI as party trick", more "can this run privately and be useful?"
- **reading-log.** RSS feed of articles I've enjoyed, on Cloudflare Workers. Lightweight, mostly for me.
- **design-experiments.** Playing with Claude Design to explore creative concepts. Small for now.

## Public work
Older security and writing work, useful context.
- "Tracking a Malicious Blogspot Redirection Campaign to ApateWeb", Validin, January 2025. Threat-intel writeup on a long-running redirector network.
- Metasploit module for CVE-2019-16328, merged into Rapid7's metasploit-framework in June 2023.
- Medium: [Who is Jevin Canders?](https://medium.com/meese-enterprises/who-is-jevin-canders-40fd2ddc0d01), OSINT investigation into the Linux mirror operator.
- Medium: [How To Easily Import A CSV/TSV File Into AWS MySQL](https://blog.aaronmeese.com/how-to-easily-import-a-csv-tsv-file-into-aws-mysql-9a5e8797eac9), practical AWS tutorial.
- Medium: [Retirement: the strategy of an 18-year-old soldier](https://medium.com/fortune-for-future/retirement-the-strategy-of-an-18-year-old-soldier-9d4ef615a0f8), finance piece on early investing.

## Life outside the keyboard
- **Domains.** Unhealthy obsession; current portfolio is around 40, let dozens go over the years after realizing I couldn't justify them. A couple are emoji domains!
- **Gym.** About 3 days a week; warm-up plus a short treadmill session, bench, curls, calf raises, abs. Runs whenever I hate myself enough.
- **Pokémon Go.** Skipped it entirely until October 2025, hooked since; regular at community events and meetups.
- **Music.** Spotify's last-12-months top genres: trap metal, horrorcore, emo rap, melodic rap, rap metal, cloud rap, underground hip hop, rap, EDM, hyperpop.
- **Competitive cyber.** Forensics main on the US Cyber Team for SIV Season 4; placed a very close second at the Palmetto Cyber Defense Competition against the Navy team (which was hosting the infrastructure).
- **Home lab.** Two GPU workstations plus a refurb Dell R740 running Proxmox. The R740 hosts a web server, two dev boxes, a NAS, Home Assistant, a FlareVM sandbox, and assorted odds and ends.
- **Around the edges.** Two cats. Eat the same handful of meals on repeat (grilled cheese pulls more weight than it should). Drink exclusively Reign Storm Clean Energy (green), which I now have to hunt for because nobody stocks it anymore.

## Daily tooling
VS Code paired with Claude Code as the actual dev harness. Hermes Agent runs alongside with a Telegram gateway so I can hand Codex the low-visibility tasks (calendar maintenance, config updates) without sitting in front of a screen for them. Formerly a Cursor user.

## Hot takes
- Non-technical leadership over-driving design decisions is the most predictable way to ship the wrong thing. The right move is holistic: agree on the premise at the top, move a layer deeper, and consider what shows up there. If something at that depth has no engineering solution, step back up and rethink. People who get attached to their plans and take offense at hole-poking aren't operating with a growth mindset.
- AI doomers are missing the shape of the curve. Some jobs disappear, some expand, some new ones spawn to handle complexity nobody anticipated. The short term will get hairy. Equilibrium catches up.
- Python: 4 spaces for syntax, 2 spaces for optional indentation inside list and dict literals. Linters hate me.

## Contact and routing
For non-work messages, the public links above.

For hiring conversations, role offers, or anything that needs me directly rather than the site version of me, email [aaron@meese.dev](mailto:aaron@meese.dev) with context.

For consulting, contracts, projects, or build-work questions, route to Meese Enterprises at [meese.enterprises](https://meese.enterprises).
