// `me: true` marks a link as another profile belonging to the same person, so
// it ships with rel="me". meese.rs links back here the same way, which is what
// makes the pair verifiable rather than two sites asserting things separately.
const links = [
  { label: "email", href: "mailto:aaron@meese.dev" },
  { label: "writing", href: "https://meese.rs", me: true },
  { label: "github", href: "https://github.com/ajmeese7", me: true },
  { label: "linkedin", href: "https://www.linkedin.com/in/aaronmeese/", me: true },
  { label: "twitter", href: "https://twitter.com/ajmeese7", me: true },
  //{ label: "resume", href: "/resume.pdf" },
];

export function Footer() {
  return (
    <footer className="border-t border-border-default mt-24 py-10 text-sm text-muted">
      <div className="mx-auto max-w-3xl px-6 flex flex-col items-center gap-4 sm:flex-row sm:items-end sm:justify-between">
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 sm:justify-start">
          {links.map((l) => {
            const external = l.href.startsWith("http");
            const rel = [l.me && "me", external && "noopener noreferrer"].filter(Boolean).join(" ");
            return (
              <a
                key={l.label}
                href={l.href}
                className="hover:text-accent transition-colors"
                target={external ? "_blank" : undefined}
                rel={rel || undefined}
              >
                ↳ {l.label}
              </a>
            );
          })}
        </nav>
        <span className="whitespace-nowrap text-center">designed &amp; built by Aaron Meese</span>
      </div>
    </footer>
  );
}
