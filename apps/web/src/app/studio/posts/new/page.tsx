import { getSeriesForSelector } from "@ruchernchong/database";
import { PostForm } from "@web/app/studio/posts/new/_components/post-form";

export default async function NewPostPage() {
  const seriesOptions = await getSeriesForSelector();

  return <PostForm seriesOptions={seriesOptions} />;
}
