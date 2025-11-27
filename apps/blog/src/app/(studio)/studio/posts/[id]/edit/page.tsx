import { Suspense } from "react";
import { EditPostForm } from "@/app/(studio)/studio/posts/[id]/edit/_components/edit-post-form";
import { getPublishedPosts } from "@/lib/queries/posts";

interface Props {
  params: Promise<{ id: string }>;
}

export const generateStaticParams = async () => {
  const allPosts = await getPublishedPosts();
  return allPosts.map((post) => ({ id: post.id }));
};

const EditPostPage = async ({ params }: Props) => {
  const { id } = await params;

  return (
    <Suspense fallback={null}>
      <EditPostForm postId={id} />
    </Suspense>
  );
};

export default EditPostPage;
