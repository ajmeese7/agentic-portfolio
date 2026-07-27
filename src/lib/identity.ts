/**
 * Who owns this site, and how that relates to meese.rs.
 *
 * The two properties serve different purposes and describe themselves
 * differently, but they are run by one person. Schema.org models that as
 * separate node types, so this emits both: one `Person`, referenced from both
 * sites by the same `@id`, and a `WebSite` per property with its own name and
 * description. A crawler merges the person into one entity without treating
 * the sites as interchangeable.
 *
 * The `@id` is a meese.dev URL because this is the canonical page about Aaron.
 * meese.rs is the canonical place for his writing.
 *
 * The Person node here must stay identical to the one in the meese.rs repo
 * (src/utils/identity.ts, pinned by identity.test.ts there). Changing PERSON_ID,
 * PERSON_NAME, PERSON_URL, or SAME_AS on one side only splits the shared entity
 * back into two half-populated people.
 */
export const SITE_NAME = "meese.dev";
export const SITE_URL = "https://meese.dev";

export const SITE_DESCRIPTION =
  "Portfolio of Aaron Meese, with an interactive clone that answers questions about his background and work.";

export const PERSON_ID = "https://meese.dev/#person";
export const PERSON_NAME = "Aaron Meese";
export const PERSON_URL = "https://meese.dev/";

/** Every profile and property that is the same person. Order is part of the contract. */
export const SAME_AS = [
  "https://meese.dev",
  "https://meese.rs",
  "https://github.com/ajmeese7",
  "https://www.linkedin.com/in/aaronmeese/",
  "https://x.com/ajmeese7",
] as const;

export function personNode() {
  return {
    "@type": "Person",
    "@id": PERSON_ID,
    name: PERSON_NAME,
    url: PERSON_URL,
    sameAs: [...SAME_AS],
  };
}

/** This site as its own entity, distinct from meese.rs, authored by the shared person. */
export function websiteNode() {
  return {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: `${SITE_URL}/`,
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    inLanguage: "en",
    author: { "@id": PERSON_ID },
    publisher: { "@id": PERSON_ID },
  };
}

export function siteGraph() {
  return {
    "@context": "https://schema.org",
    "@graph": [websiteNode(), personNode()],
  };
}
