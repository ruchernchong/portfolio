import { getPublishedPosts } from "@ruchernchong/database";
import { FeaturedWork } from "@web/app/_components/home/featured-work";
import { HeroSection } from "@web/app/_components/home/hero-section";
import { LatestPosts } from "@web/app/_components/home/latest-posts";
import { QuickStats } from "@web/app/_components/home/quick-stats";
import { StructuredData } from "@web/app/_components/structured-data";
import { BASE_URL } from "@web/config";
import projects from "@web/data/projects";
import { serverTrpc } from "@web/server";
import type { WebSite, WithContext } from "schema-dts";

async function HomePage() {
  const structuredData: WithContext<WebSite> = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Ru Chern",
    url: BASE_URL,
    description:
      "Personal blog and portfolio of Ru Chern, featuring posts on software development, technology and personal projects.",
    image: [
      {
        "@type": "ImageObject",
        url: `${BASE_URL}/cover-image.png`,
        width: "1200",
        height: "630",
      },
    ],
    sameAs: [
      "https://github.com/ruchernchong",
      "https://www.linkedin.com/in/ruchernchong",
      "https://twitter.com/ruchernchong",
    ],
  };

  const [totalVisits, stars, allPosts] = await Promise.all([
    serverTrpc.analytics.getTotalVisits(),
    serverTrpc.github.getStars(),
    getPublishedPosts(),
  ]);

  const latestPosts = allPosts.slice(0, 3);
  const postsCount = allPosts.length;

  return (
    <>
      <StructuredData data={structuredData} />
      <div className="flex flex-col gap-12">
        <HeroSection />
        <QuickStats
          visits={totalVisits ?? 0}
          posts={postsCount}
          stars={stars ?? 0}
        />
        <FeaturedWork projects={projects} />
        <LatestPosts posts={latestPosts} />
      </div>
    </>
  );
}

export default HomePage;
