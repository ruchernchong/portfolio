import Link from "next/link";
import { format, formatISO, parseISO } from "date-fns";
import { ArrowRightIcon } from "@heroicons/react/20/solid";
import { Typography } from "@/components/Typography";

interface BlogPostProps {
  title: string;
  url: string;
  excerpt: string;
  publishedAt: string;
}

const BlogPost = ({ title, url, excerpt, publishedAt }: BlogPostProps) => {
  const formattedDate = format(parseISO(publishedAt), "iiii, dd MMMM yyyy");

  return (
    <div
      className="group relative cursor-pointer"
      data-umami-event="blog-post-interaction"
      data-umami-event-title={title}
    >
      <div className="mb-4 flex flex-col-reverse md:flex-row md:justify-between">
        <div className="w-full basis-2/3">
          <Link
            href={url}
            className="group-hover:text-pink-500"
            data-umami-event="blog-post-title-click"
            data-umami-event-title={title}
            data-umami-event-url={url}
          >
            <Typography variant="h3" className="capitalize">
              {title}
            </Typography>
          </Link>
          <p
            className="line-clamp-2 text-gray-400"
            data-umami-event="blog-post-excerpt-view"
            data-umami-event-title={title}
          >
            {excerpt}
          </p>
        </div>
        <time
          dateTime={formatISO(parseISO(publishedAt))}
          title={formattedDate}
          className="italic text-gray-400"
          data-umami-event="blog-post-date-view"
          data-umami-event-title={title}
          data-umami-event-date={publishedAt}
        >
          {formattedDate}
        </time>
      </div>
      <div
        className="flex items-center gap-x-1"
        data-umami-event="blog-post-read-more"
        data-umami-event-title={title}
        data-umami-event-url={url}
      >
        Read more
        <ArrowRightIcon
          width={20}
          height={20}
          className="hidden text-pink-500 group-hover:block"
        />
      </div>
    </div>
  );
};

export default BlogPost;