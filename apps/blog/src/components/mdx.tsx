import { ArrowUpRightIcon } from "@heroicons/react/16/solid";
import type { MDXComponents } from "mdx/types";
import Image from "next/image";
import Link from "next/link";
import { compileMDX } from "next-mdx-remote/rsc";
import { Suspense } from "react";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePrettyCode, {
  type Options as PrettyCodeOptions,
} from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import remarkUnwrapImages from "remark-unwrap-images";
import { Typography } from "@/components/Typography";

const CustomLink = ({ href, children, ...props }: any) => {
  const isInternalLink = href && (href.startsWith("/") || href.startsWith("#"));

  if (isInternalLink) {
    return (
      <Link
        href={href}
        className="text-pink-500 hover:text-pink-300"
        {...props}
      >
        {children}
      </Link>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="text-pink-500 hover:text-pink-300"
      {...props}
    >
      <span>
        {children}
        <ArrowUpRightIcon className="inline-flex h-4 w-4 align-super" />
      </span>
    </a>
  );
};

const ImageComponent = ({ alt, ...props }: any) => (
  <figure>
    <Suspense fallback={null}>
      <Image
        alt={alt}
        width={0}
        height={0}
        sizes="100vw"
        className="h-auto w-full rounded-2xl"
        {...props}
      />
    </Suspense>
    {alt && (
      <figcaption className="text-center font-bold text-xs text-zinc-50 italic">
        {alt}
      </figcaption>
    )}
  </figure>
);

const components: MDXComponents = {
  a: CustomLink,
  h1: (props) => <Typography variant="h1" {...props} />,
  h2: (props) => (
    <Typography
      variant="h2"
      className="mt-24 text-3xl text-yellow-400"
      {...props}
    />
  ),
  h3: (props) => (
    <Typography variant="h3" className="mt-16 text-2xl" {...props} />
  ),
  img: ImageComponent,
};

export const Mdx = async ({ content }: { content: string }) => {
  const { content: mdxContent } = await compileMDX({
    source: content,
    components,
    options: {
      parseFrontmatter: false, // We use database fields instead of frontmatter
      mdxOptions: {
        remarkPlugins: [remarkGfm, remarkUnwrapImages],
        rehypePlugins: [
          rehypeSlug,
          [
            rehypePrettyCode,
            {
              theme: "github-dark-dimmed",
            } satisfies PrettyCodeOptions,
          ],
          [
            rehypeAutolinkHeadings,
            {
              behavior: "append",
              properties: {
                className: ["permalink"],
              },
            },
          ],
        ],
      },
    },
  });

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div>{mdxContent}</div>
    </Suspense>
  );
};
