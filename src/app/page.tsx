import { Banner } from "@/components/Banner";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { ProjectsGrid } from "@/components/ProjectsGrid";
import { projects } from "@/content/projects";

export default function Home() {
  return (
    <>
      <main className="flex-1 mx-auto w-full max-w-5xl px-6 pt-16 sm:pt-24">
        <Hero banner={<Banner />} />
        <ProjectsGrid projects={projects} />
      </main>
      <Footer />
    </>
  );
}
