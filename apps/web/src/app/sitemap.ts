import { getPublishedPosts } from "@ruchernchong/database";
import { BASE_URL, navLinks } from "@web/config";
import projects from "@web/data/projects";
import type { MetadataRoute } from "next";

const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  const publishedPosts = await getPublishedPosts();

  return [
    { url: BASE_URL, lastModified: formatLastModified() },
    ...navLinks
      .filter(({ href }) => href !== "/")
      .map(({ href }) => ({
        url: `${BASE_URL}${href}`,
        lastModified: formatLastModified(),
      })),
    ...projects.map(({ slug }) => ({
      url: `${BASE_URL}/projects/${slug}`,
      lastModified: formatLastModified(),
    })),
    ...publishedPosts.map((post) => ({
      url: `${BASE_URL}${post.metadata.canonical}`,
      lastModified: formatLastModified(post.publishedAt || new Date()),
      changeFrequency: "daily" as const,
    })),
  ];
};

const formatLastModified = (datetime: Date | string = new Date()): string =>
  new Date(datetime).toISOString().split("T")[0];

export default sitemap;
