import { db, posts } from "@ruchernchong/database";
import { ERROR_IDS } from "@web/constants/error-ids";
import {
  handleApiError,
  notFoundResponse,
  requireAuth,
  validateRouteParam,
} from "@web/lib/api";
import { postIdSchema } from "@web/types/api";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const POST = async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const authResult = await requireAuth("restore posts");
  if (!authResult.success) return authResult.response;

  const paramResult = await validateRouteParam(
    params,
    "id",
    postIdSchema,
    "post",
  );
  if (!paramResult.success) return paramResult.response;

  try {
    const [restoredPost] = await db
      .update(posts)
      .set({ deletedAt: null })
      .where(eq(posts.id, paramResult.data))
      .returning();

    if (!restoredPost) return notFoundResponse("Post");

    return NextResponse.json({
      message: "Post restored successfully",
      post: restoredPost,
    });
  } catch (error) {
    return handleApiError(error, ERROR_IDS.POST_UPDATE_FAILED, "restore post", {
      postId: paramResult.data,
    });
  }
};
