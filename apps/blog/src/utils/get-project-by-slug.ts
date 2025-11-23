import projects from "@/data/projects";

export const getProjectBySlug = (slug: string) => {
  return projects.find((project) => project.slug === slug);
};
