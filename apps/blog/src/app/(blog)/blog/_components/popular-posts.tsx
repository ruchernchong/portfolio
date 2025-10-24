import { EyeIcon } from "@heroicons/react/24/outline";
import { format, formatISO } from "date-fns";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shared/card";
import { popularPostsService } from "@/lib/services";

export const PopularPosts = async () => {
  const popularPosts = await popularPostsService.getPopularPosts(3);

  if (!popularPosts.length) {
    return null;
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="font-bold text-pink-500 text-xl uppercase">
        Popular Posts
      </div>
      <div className="grid gap-4 md:auto-cols-fr md:grid-flow-col">
        {popularPosts.map((post) => {
          if (!post.publishedAt) {
            return null;
          }

          const formattedDate = format(post.publishedAt, "EEEE, dd MMMM yyyy");

          return (
            <Card key={post.id}>
              <Link
                href={post.metadata.canonical}
                className="flex h-full flex-col"
              >
                <CardHeader>
                  <div className="flex items-center justify-between gap-4">
                    <time
                      dateTime={formatISO(post.publishedAt)}
                      title={formattedDate}
                      className="text-sm text-zinc-400 italic"
                    >
                      {formattedDate}
                    </time>
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <EyeIcon className="h-4 w-4" />
                      <span>{post.views}</span>
                    </div>
                  </div>
                  <CardTitle className="capitalize">{post.title}</CardTitle>
                </CardHeader>
                <CardContent>{post.summary}</CardContent>
              </Link>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
