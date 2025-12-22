import { UserIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { StructuredData } from "@web/app/_components/structured-data";
import Employment from "@web/app/(main)/about/_components/employment";
import globalMetadata from "@web/app/metadata";
import ExternalLink from "@web/components/external-link";
import * as Icons from "@web/components/icons";
import { PageTitle } from "@web/components/page-title";
import { BASE_URL } from "@web/config";
import companies from "@web/data/companies";
import socials from "@web/data/socials";
import type { Metadata } from "next";
import type { WebPage, WithContext } from "schema-dts";

const title = "About";
const description =
  "I'm Ru Chern, a frontend developer focused on optimizing performance and delivering excellent user experiences.";
const canonical = "/about";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    ...globalMetadata.openGraph,
    title,
    description,
    url: canonical,
  },
  twitter: {
    ...globalMetadata.twitter,
    title,
    description,
  },
  alternates: {
    canonical,
  },
};

export default async function AboutPage() {
  const sortedCompanies = companies.toSorted(
    (a, b) => new Date(b.dateStart).getTime() - new Date(a.dateStart).getTime(),
  );
  const currentPosition = sortedCompanies
    .filter(({ dateEnd }) => !dateEnd)
    .map(({ title, name }) => `${title} @ ${name}`)
    .join(" | ");

  const structuredData: WithContext<WebPage> = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
    url: `${BASE_URL}${canonical}`,
  };

  return (
    <>
      <StructuredData data={structuredData} />
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-8">
          <PageTitle
            title="About Me"
            description={currentPosition}
            icon={
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                <HugeiconsIcon
                  icon={UserIcon}
                  size={20}
                  className="text-primary"
                />
              </div>
            }
          />
          <div className="flex flex-col gap-4">
            <p className="text-muted-foreground">{description}</p>
            <div className="flex gap-4">
              {socials.map(({ name, link }) => (
                <ExternalLink
                  key={name}
                  href={link}
                  className="hover:text-foreground"
                >
                  <Icons.Social name={name} className="size-4" />
                </ExternalLink>
              ))}
            </div>
          </div>
        </div>
        <hr className="border-border" />
        <Employment companies={sortedCompanies} />
      </div>
    </>
  );
}
