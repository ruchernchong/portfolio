import type { Metadata } from "next";
import globalMetadata from "@/metadata";
import { openGraphImage, twitterImage } from "@/shared-metadata";
import { Chip } from "@/components/Chip";
import { ItemOverlay } from "@/components/ItemOverlay";
import { LinkWithIcon } from "@/components/LinkWithIcon";
import { StructuredData } from "@/components/StructuredData";
import { Typography } from "@/components/Typography";
import projects from "@/data/projects";
import type { WebPage, WithContext } from "schema-dts";
import { BASE_URL } from "@/config";

const title = "Projects";
const description =
  "A showcase of my past projects and/or experimenting with different technologies";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    ...globalMetadata.openGraph,
    title,
    description,
    url: "/projects",
    ...openGraphImage,
  },
  twitter: {
    ...globalMetadata.twitter,
    title,
    description,
    ...twitterImage,
  },
  alternates: {
    canonical: "/projects",
  },
};

const ProjectsPage = async () => {
  const structuredData: WithContext<WebPage> = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": "/projects",
    },
    description,
    url: `${BASE_URL}/projects`,
  };

  return (
    <>
      <StructuredData data={structuredData} />
      <div
        data-umami-event="page-view"
        data-umami-event-page="projects"
        data-umami-event-project-count={projects.length}
      >
        <Typography
          variant="h1"
          className="mb-8"
          data-umami-event="projects-title-view"
        >
          Projects
        </Typography>
        <Typography
          variant="h2"
          className="mb-8"
          data-umami-event="projects-description-view"
        >
          {description}
        </Typography>
        <div className="flex flex-col gap-y-12">
          {projects.map(({ name, description, skills, links }) => {
            return (
              <div
                key={name}
                className="group relative"
                data-umami-event="project-card-view"
                data-umami-event-project={name}
              >
                <div className="flex flex-col items-start gap-4">
                  <ItemOverlay />
                  <Typography
                    variant="h3"
                    className="z-20"
                    data-umami-event="project-title-view"
                    data-umami-event-title={name}
                  >
                    {name}
                  </Typography>
                  <div
                    className="flex flex-wrap gap-2"
                    data-umami-event="project-skills-view"
                    data-umami-event-project={name}
                    data-umami-event-skills={skills?.join(",")}
                  >
                    {skills?.map((skill) => {
                      return (
                        <Chip
                          key={skill}
                          data-umami-event="project-skill-click"
                          data-umami-event-skill={skill}
                          data-umami-event-project={name}
                        >
                          {skill}
                        </Chip>
                      );
                    })}
                  </div>
                  <div
                    className="z-20 text-gray-400"
                    data-umami-event="project-description-view"
                    data-umami-event-project={name}
                  >
                    {description}
                  </div>
                  {links.map((link) => (
                    <LinkWithIcon
                      key={link}
                      url={link}
                      data-umami-event="project-link-click"
                      data-umami-event-project={name}
                      data-umami-event-url={link}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default ProjectsPage;
