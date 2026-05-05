import { Banner } from "@/components/Banner";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { ProjectsCarousel } from "@/components/ProjectsCarousel";
import { projects } from "@/content/projects";

export default function Home() {
  return (
    <>
      <main className="flex-1 mx-auto w-full max-w-5xl px-6 pt-16 sm:pt-24">
        <Hero banner={<Banner />} />
        <ProjectsCarousel projects={projects} />
      </main>
      <Footer />
    </>
  );
}
