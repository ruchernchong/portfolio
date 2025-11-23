import {
  BookOpenIcon,
  CalendarDaysIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { format, formatISO } from "date-fns";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { StructuredData } from "@/app/(blog)/_components/structured-data";
import StatsBar from "@/app/(blog)/analytics/_components/stats-bar";
import { Mdx } from "@/app/(blog)/blog/_components/mdx";
import { RelatedPosts } from "@/app/(blog)/blog/_components/related-posts";
import { Typography } from "@/components/shared/typography";
import {
  getPublishedPostBySlug,
  // getPublishedPostSlugs,
} from "@/lib/queries/posts";
import { generateUserHash } from "@/utils/hash";

interface Props {
  params: Promise<{ slug: string }>;
}

interface CachedPostContentProps {
  slug: string;
  userHash: string;
}

export const generateMetadata = async ({
  params,
}: Props): Promise<Metadata> => {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return {
    title: post.title,
    description: post.metadata.description,
    openGraph: post.metadata.openGraph,
    twitter: post.metadata.twitter,
    alternates: {
      canonical: post.metadata.canonical,
    },
  };
};

// TODO: Re-enable static generation after resolving Cache Components conflict with headers()
// Currently disabled because headers() access for IP hashing makes the route dynamic
// export const generateStaticParams = async () => {
//   const publishedPosts = await getPublishedPostSlugs();
//
//   return publishedPosts.map(({ slug }) => ({ slug }));
// };

const PostPage = async ({ params }: Props) => {
  return (
    <Suspense fallback={null}>
      <Content params={params} />
    </Suspense>
  );
};

const Content = async ({ params }: Props) => {
  await connection();

  const { slug } = await params;
  const headersList = await headers();
  const forwardedFor = headersList.get("x-forwarded-for");
  const realIp = headersList.get("x-real-ip");
  const ipAddress = forwardedFor?.split(",")[0] ?? realIp ?? "127.0.0.1";
  const userHash = generateUserHash(ipAddress);

  return <CachedPostContent slug={slug} userHash={userHash} />;
};

const CachedPostContent = async ({
  slug,
  userHash,
}: CachedPostContentProps) => {
  const post = await getPublishedPostBySlug(slug);

  if (!post || !post.publishedAt) {
    return notFound();
  }

  const formattedDate = format(post.publishedAt, "dd MMM yyyy");

  return (
    <>
      <StructuredData data={post.metadata.structuredData} />
      <article className="prose prose-invert mx-auto mb-16 max-w-4xl prose-img:rounded-2xl prose-a:text-pink-500">
        <div className="flex flex-col items-center gap-y-4 text-center">
          <Suspense fallback={null}>
            <StatsBar slug={post.slug} userHash={userHash} />
          </Suspense>
          <div className="flex gap-x-2 text-zinc-400 md:flex-row">
            <div className="flex items-center justify-center gap-x-2">
              <CalendarDaysIcon className="h-6 w-6" />
              <time
                dateTime={formatISO(post.publishedAt)}
                title={formattedDate}
              >
                {formattedDate}
              </time>
            </div>
            <div className="flex items-center justify-center gap-x-2">
              <span>&middot;</span>
              <BookOpenIcon className="h-6 w-6" />
              <div>{post.metadata.readingTime}</div>
            </div>
            {post.author && (
              <div className="flex items-center justify-center gap-x-2">
                <span>&middot;</span>
                <span>By {post.author.name}</span>
              </div>
            )}
          </div>
          <Typography variant="h1">{post.title}</Typography>
        </div>
        <aside className="relative rounded-md border-l-4 border-l-pink-500 bg-zinc-800 p-6">
          <div className="-translate-x-[50%] -translate-y-[50%] absolute top-0 left-0 rounded-full bg-zinc-900 p-2 text-pink-500">
            <InformationCircleIcon width={32} height={32} />
          </div>
          {post.summary}
        </aside>
        <div>
          <Mdx content={post.content} />
        </div>
        <RelatedPosts slug={post.slug} />
      </article>
    </>
  );
};

export default PostPage;
