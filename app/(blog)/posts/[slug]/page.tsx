import type { Metadata } from "next";
// import Link from "next/link";
import { notFound } from "next/navigation";
// import classNames from "classnames";
import { format, formatISO, parseISO } from "date-fns";
// import Card from "@/components/Card";
// import { Mdx } from "@/components/Mdx";
import { StructuredData } from "@/components/StructuredData";
import { Typography } from "@/components/Typography";
import { ViewCounter } from "@/components/ViewCounter";
import { BASE_URL } from "@/config";
import {
  BookOpenIcon,
  CalendarDaysIcon,
  EyeIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { truncate } from "@/utils/truncate";
import { getPayload } from "payload";
import config from "../../../../payload.config";

type Params = Promise<{ slug: string }>;

export const generateMetadata = async (props: {
  params: Params;
}): Promise<Metadata> => {
  const params = await props.params;
  const slug = params.slug;

  const payload = await getPayload({ config });
  const response = await payload.find({
    collection: "posts",
    draft: true,
    where: { slug: { equals: slug } },
  });
  const post = response.docs[0];

  const title = post.title;
  const description = truncate(post.excerpt);
  const publishedTime = post.publishedAt;
  const url = post.url;
  const images = `${BASE_URL}/og?title=${title}`;

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

export const generateStaticParams = async () => {
  const payload = await getPayload({ config });
  const response = await payload.find({ collection: "posts", draft: true });
  const posts = response.docs;

  return posts.map(({ slug }) => ({ slug }));
};

const PostPage = async (props: { params: Params }) => {
  const params = await props.params;
  const slug = params.slug;

  const payload = await getPayload({ config });
  const response = await payload.find({
    collection: "posts",
    draft: false,
    limit: 1,
    where: { slug: { equals: slug } },
  });
  console.log(response);

  const post = response.docs[0];

  if (!post) {
    return notFound();
  }

  // post = {
  //   ...post,
  //   previous,
  //   next,
  //   readingTime: readingTime(post.content).text,
  // };

  // const publishedDate = post.publishedDate;
  // const previousPost = post.previous;
  // const nextPost = post.next;

  const formattedDate = format(parseISO(post.publishedAt), "dd MMM yyyy");

  return (
    <>
      {/*<StructuredData data={post.structuredData} />*/}
      <article className="prose prose-invert mx-auto mb-16 max-w-4xl prose-a:text-pink-500 prose-img:rounded-2xl">
        <div className="flex flex-col items-center gap-y-4 text-center">
          <div className="flex flex-col gap-x-2 text-gray-400 md:flex-row">
            <div
              className="flex items-center justify-center gap-x-2"
              data-umami-event="post-date-view"
              data-umami-event-slug={post.slug}
            >
              <CalendarDaysIcon className="h-6 w-6" />
              <time
                dateTime={formatISO(parseISO(post.publishedAt))}
                title={formattedDate}
              >
                {formattedDate}
              </time>
            </div>
            <div
              className="flex items-center justify-center gap-x-2"
              data-umami-event="post-stats-view"
              data-umami-event-slug={post.slug}
            >
              <div className="hidden md:block">&middot;</div>
              <BookOpenIcon className="h-6 w-6" />
              <div data-umami-event="reading-time-view">{post.readingTime}</div>
              <div>&middot;</div>
              <EyeIcon className="h-6 w-6" />
              <ViewCounter
                slug={post.slug}
                data-umami-event="view-counter-interaction"
                data-umami-event-slug={post.slug}
              />
            </div>
          </div>
          <Typography variant="h1">{post.title}</Typography>
        </div>
        <aside
          className="relative rounded-md border-l-4 border-l-pink-500 bg-gray-800 p-6"
          data-umami-event="post-excerpt-view"
          data-umami-event-slug={post.slug}
        >
          <div className="absolute left-0 top-0 -translate-x-[50%] -translate-y-[50%] rounded-full bg-gray-900 p-2 text-pink-500">
            <InformationCircleIcon width={32} height={32} />
          </div>
          {post.excerpt}
        </aside>
        <div
          data-umami-event="post-content-view"
          data-umami-event-slug={post.slug}
        >
          {/*<Mdx code={post.body.code} />*/}
        </div>
      </article>
      {/*<div className="mb-16 grid gap-y-4 md:grid-cols-2 md:gap-x-4">*/}
      {/*  <Link href={`/blog/${previousPost?.slug}`}>*/}
      {/*    <Card*/}
      {/*      className={classNames(*/}
      {/*        "flex cursor-pointer flex-col items-start text-left",*/}
      {/*        {*/}
      {/*          "pointer-events-none opacity-0": !previousPost,*/}
      {/*          "opacity-100": previousPost,*/}
      {/*        }*/}
      {/*      )}*/}
      {/*    >*/}
      {/*      <div className="text-gray-400">Previous:</div>*/}
      {/*      <div>{previousPost?.title}</div>*/}
      {/*    </Card>*/}
      {/*  </Link>*/}
      {/*  <Link href={`/blog/${nextPost?.slug}`}>*/}
      {/*    <Card*/}
      {/*      className={classNames(*/}
      {/*        "flex cursor-pointer flex-col items-end text-right",*/}
      {/*        {*/}
      {/*          "pointer-events-none opacity-0": !nextPost,*/}
      {/*          "opacity-100": nextPost,*/}
      {/*        }*/}
      {/*      )}*/}
      {/*    >*/}
      {/*      <div className="text-gray-400">Next:</div>*/}
      {/*      <div>{nextPost?.title}</div>*/}
      {/*    </Card>*/}
      {/*  </Link>*/}
      {/*</div>*/}
    </>
  );
};

export default PostPage;
