const links = [
  { label: "email", href: "mailto:aaron@meese.dev" },
  { label: "github", href: "https://github.com/ajmeese7" },
  { label: "linkedin", href: "https://www.linkedin.com/in/aaronmeese/" },
  { label: "twitter", href: "https://twitter.com/ajmeese7" },
  //{ label: "resume", href: "/resume.pdf" },
];

export function Footer() {
  return (
    <footer className="border-t border-border-default mt-24 py-10 text-sm text-muted">
      <div className="mx-auto max-w-3xl px-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <nav className="flex flex-wrap gap-x-6 gap-y-2">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="hover:text-accent transition-colors"
              target={l.href.startsWith("http") ? "_blank" : undefined}
              rel={l.href.startsWith("http") ? "noopener noreferrer" : undefined}
            >
              ↳ {l.label}
            </a>
          ))}
        </nav>
        <span className="whitespace-nowrap">designed &amp; built by Aaron Meese</span>
      </div>
    </footer>
  );
}
