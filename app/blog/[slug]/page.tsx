import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import classNames from "classnames";
import { format, formatISO, parseISO } from "date-fns";
import Card from "@/components/Card";
import MDXComponents from "@/components/MDXComponents";
import MDXRemote from "@/components/MDXRemote";
import StructuredData from "@/components/StructuredData";
import ViewCounter from "@/components/ViewCounter";
import { postQuery, postSlugsQuery } from "@/lib/queries";
import { sanityClient } from "@/lib/sanity-server";
import readingTime from "reading-time";
import { HOST_URL } from "@/config";
import { BlogPosting, WithContext } from "schema-dts";
import {
  BookOpenIcon,
  CalendarDaysIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import type { Post } from "@/lib/types";

export const generateMetadata = async ({ params }): Promise<Metadata> => {
  const slug = params.slug;

  const { post }: { post: Post } = await sanityClient.fetch(postQuery, {
    slug,
  });

  if (!post) {
    return;
  }

  const title = post.title;
  const description = post.excerpt;
  const publishedTime = post.publishedDate;
  const url = `${HOST_URL}/blog/${slug}`;

  const ogImageUrlParams = { title };
  const urlParams = Object.entries(ogImageUrlParams)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  const ogImageUrl = encodeURI(`${HOST_URL}/api/og?${urlParams}`);
  const images = [ogImageUrl];

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime,
      url,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images,
    },
    alternates: {
      canonical: url,
    },
  };
};

const PostPage = async ({ params }) => {
  let { post, previous, next } = await sanityClient.fetch(postQuery, {
    slug: params.slug,
  });

  if (!post) {
    notFound();
  }

  post = {
    ...post,
    previous,
    next,
    readingTime: readingTime(post.content).text,
  };

  const publishedDate = post.publishedDate;
  const previousPost = post.previous;
  const nextPost = post.next;

  const formattedDate = format(parseISO(publishedDate), "dd MMMM yyyy");
  const ogImageUrlParams = {
    title: post.title,
  };
  const urlParams = Object.entries(ogImageUrlParams)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  const ogImageUrl = encodeURI(`${HOST_URL}/api/og?${urlParams}`);

  const structuredData: WithContext<BlogPosting> = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    image: ogImageUrl,
    description: post.excerpt,
    url: `${HOST_URL}/blog/${post.slug}`,
    author: [
      {
        "@type": "Person",
        name: "Ru Chern Chong",
        url: "https://ruchern.xyz",
      },
    ],
    datePublished: publishedDate,
    // TODO: Coming soon
    // mainEntityOfPage: {
    //   "@type": "WebPage",
    //   "@id": `${HOST_URL}/blog`,
    // },
  };

  return (
    <>
      <StructuredData data={structuredData} />
      <article className="prose mx-auto mb-16 max-w-4xl prose-img:rounded-2xl dark:prose-invert">
        <div className="mb-4 flex flex-col items-center justify-center text-neutral-600 dark:text-neutral-400 md:flex-row">
          <div className="flex flex-col md:flex-row">
            <div className="flex items-center justify-center">
              <CalendarDaysIcon className="mr-2 h-6 w-6" />
              <time
                dateTime={formatISO(parseISO(publishedDate))}
                title={formattedDate}
              >
                {formattedDate}
              </time>
            </div>
            <div className="flex items-center justify-center">
              <div className="mx-2 hidden md:block">&middot;</div>
              <BookOpenIcon className="mr-2 h-6 w-6" />
              <div>{post.readingTime}</div>
              <div className="mx-2">&middot;</div>
              <EyeIcon className="mr-2 h-6 w-6" />
              <ViewCounter slug={post.slug} />
            </div>
          </div>
        </div>
        <h1 className="text-center">{post.title}</h1>
        <MDXRemote source={post.content} components={MDXComponents} />
      </article>
      <div className="mb-16 grid gap-y-4 md:grid-cols-2 md:gap-x-4">
        <Link href={`/blog/${previousPost?.slug}`}>
          <Card
            className={classNames(
              "flex cursor-pointer flex-col items-start text-left",
              {
                "pointer-events-none opacity-0": !previousPost,
                "opacity-100": previousPost,
              }
            )}
          >
            <div className="text-neutral-900 dark:text-neutral-400">
              Previous:
            </div>
            <div>{previousPost?.title}</div>
          </Card>
        </Link>
        <Link href={`/blog/${nextPost?.slug}`}>
          <Card
            className={classNames(
              "flex cursor-pointer flex-col items-end text-right",
              {
                "pointer-events-none opacity-0": !nextPost,
                "opacity-100": nextPost,
              }
            )}
          >
            <div className="text-neutral-900 dark:text-neutral-400">Next:</div>
            <div>{nextPost?.title}</div>
          </Card>
        </Link>
      </div>
    </>
  );
};

export const generateStaticParams = async () => {
  const paths = await sanityClient.fetch(postSlugsQuery);

  return paths.map((slug: string) => ({ params: { slug } }));
};

export default PostPage;