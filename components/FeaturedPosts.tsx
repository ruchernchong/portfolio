import Link from "next/link";
import { format, formatISO, parseISO } from "date-fns";
import { Post } from "lib/types";

type Props = {
  featuredPosts: Post[];
};

const FeaturedPosts = ({ featuredPosts }: Props) => {
  return (
    <>
      <h2 className="mb-6 text-3xl font-bold md:text-4xl">Featured Posts</h2>
      <div className="mb-6 grid md:grid-cols-3">
        {featuredPosts
          .slice(0, 3)
          .map(({ title, slug, excerpt, publishedDate }) => {
            const formattedDate = format(
              parseISO(publishedDate),
              "dd MMM yyyy"
            );

            return (
              <div
                key={title}
                className="mb-8 w-full md:p-4 first:md:pl-0 last:md:pr-0"
              >
                <div className="flex-col md:flex md:flex-row md:items-center md:justify-between">
                  <Link
                    href={`/blog/${slug}`}
                    className="transition hover:opacity-50"
                  >
                    <h3 className="text-xl font-medium">{title}</h3>
                  </Link>
                </div>
                <time
                  dateTime={formatISO(parseISO(publishedDate))}
                  title={formattedDate}
                  className="italic text-neutral-600 dark:text-neutral-400"
                >
                  {formattedDate}
                </time>
                <p className="flex-1 text-neutral-600 dark:text-neutral-400">
                  {excerpt}
                </p>
              </div>
            );
          })}
      </div>
    </>
  );
};

export default FeaturedPosts;