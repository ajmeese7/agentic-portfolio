import { describe, expect, it } from "vitest";
import { PERSON_ID, personNode, siteGraph, websiteNode } from "./identity";

describe("personNode", () => {
  // The meese.rs repo pins this same object in src/utils/identity.test.ts. If
  // this test needs updating, the change has to land in both repos in the same
  // breath or the shared entity splits into two half-populated people.
  it("is the exact node meese.rs must also emit", () => {
    // Arrange / Act
    const person = personNode();

    // Assert
    expect(person).toEqual({
      "@type": "Person",
      "@id": "https://meese.dev/#person",
      name: "Aaron Meese",
      url: "https://meese.dev/",
      sameAs: [
        "https://meese.dev",
        "https://meese.rs",
        "https://github.com/ajmeese7",
        "https://www.linkedin.com/in/aaronmeese/",
        "https://x.com/ajmeese7",
      ],
    });
  });
});

describe("websiteNode", () => {
  it("is its own entity, distinct from the person and from meese.rs", () => {
    // Arrange / Act
    const site = websiteNode();

    // Assert
    expect(site["@id"]).toBe("https://meese.dev/#website");
    expect(site["@id"]).not.toBe(PERSON_ID);
    expect(site.name).toBe("meese.dev");
    expect(site.description).not.toContain("writing");
  });

  it("credits the shared person by reference rather than restating them", () => {
    // Arrange / Act
    const site = websiteNode();

    // Assert
    expect(site.author).toEqual({ "@id": PERSON_ID });
    expect(site.publisher).toEqual({ "@id": PERSON_ID });
  });
});

describe("siteGraph", () => {
  it("emits one website and one person, and nothing else", () => {
    // Arrange / Act
    const graph = siteGraph();

    // Assert
    expect(graph["@context"]).toBe("https://schema.org");
    expect(graph["@graph"].map((n) => n["@type"])).toEqual(["WebSite", "Person"]);
  });
});
