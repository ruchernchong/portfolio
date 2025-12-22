import { getSeriesForSelector } from "@ruchernchong/database";
import { EditPostForm } from "@web/app/studio/posts/[id]/edit/_components/edit-post-form";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const seriesOptions = await getSeriesForSelector();

  return <EditPostForm postId={id} seriesOptions={seriesOptions} />;
}
