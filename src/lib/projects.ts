export type Project = {
  slug: string;
  title: string;
  blurb: string;
  stars?: number;
  tags: string[];
  repo?: string;
  live?: string;
};
