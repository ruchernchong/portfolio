import { GetStaticPaths, GetStaticProps } from "next";
import Image from "next/image";
import { format, parseISO } from "date-fns";
import Layout from "components/Layout";
import { HOST_URL } from "lib/config";
import { postQuery, postSlugsQuery } from "lib/queries";
import { sanityClient } from "lib/sanity-server";
import { MDXRemote } from "next-mdx-remote";
import { serialize } from "next-mdx-remote/serialize";
import readingTime from "reading-time";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeCodeTitles from "rehype-code-titles";
import rehypePrism from "rehype-prism-plus";

import avatar from "public/avatar.jpg";

export default function PostPage({ post }) {
  // const canonicalUrl = new URL(post.canonical_url);
  // const originalPostUrl = canonicalUrl?.href;
  // const originalPostHostname = canonicalUrl?.hostname;

  const ogImageUrlParams = {
    title: post.title,
    date: format(parseISO(post.date), "dd MMMM yyyy"),
  };
  const urlParams = Object.entries(ogImageUrlParams)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  const ogImageUrl = encodeURI(`${HOST_URL}/api/og?${urlParams}`);

  // @ts-ignore
  return (
    <Layout
      title={`${post.title} - Ru Chern`}
      description={post.excerpt}
      image={ogImageUrl}
      date={post.date}
      type="article"
    >
      <article className="prose mx-auto mb-6 max-w-4xl prose-img:rounded-2xl dark:prose-invert">
        <h1>{post.title}</h1>
        <div className="flex w-full flex-col items-start justify-between text-neutral-600 dark:text-neutral-400 md:flex-row md:items-center">
          <div className="mb-2 flex items-center">
            <Image
              src={avatar}
              width={24}
              className="not-prose m-0 mr-2"
              alt="Ru Chern Chong"
              priority
            />
            <p className="not-prose m-0">
              Ru Chern Chong &middot;{" "}
              {format(parseISO(post.date), "dd MMMM yyyy")}
            </p>
          </div>
          <p className="not-prose m-0 mb-2">{post.readingTime}</p>
        </div>
        {/*{canonicalUrl && (*/}
        {/*  <div className="text-sm italic text-neutral-600 dark:text-neutral-400">*/}
        {/*    Also published at{" "}*/}
        {/*    <a href={originalPostUrl} target="_blank" rel="noreferrer">*/}
        {/*      {originalPostHostname}*/}
        {/*    </a>*/}
        {/*  </div>*/}
        {/*)}*/}
        <MDXRemote {...post.mdxSource} />
      </article>
    </Layout>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const paths = await sanityClient.fetch(postSlugsQuery);

  return {
    paths: paths.map((slug) => ({ params: { slug } })),
    fallback: "blocking",
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const { post } = await sanityClient.fetch(postQuery, {
    slug: params.slug,
  });
  const mdxSource = await serialize(post.content, {
    mdxOptions: {
      remarkPlugins: [remarkGfm],
      rehypePlugins: [rehypeSlug, rehypeCodeTitles, rehypePrism],
    },
  });

  return {
    props: {
      post: {
        ...post,
        mdxSource,
        readingTime: readingTime(post.content).text,
      },
    },
  };
};