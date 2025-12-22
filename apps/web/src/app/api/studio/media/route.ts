import { ERROR_IDS } from "@web/constants/error-ids";
import {
  conflictResponse,
  handleApiError,
  isUniqueConstraintError,
  parseAndValidateBody,
  requireAuth,
} from "@web/lib/api";
import { logError } from "@web/lib/logger";
import { loadMediaSearchParams } from "@web/lib/search-params/media";
import { mediaService } from "@web/lib/services";
import { confirmUploadSchema } from "@web/types/api";
import { NextResponse } from "next/server";

export const GET = async (request: Request) => {
  try {
    const { search, limit, offset } = loadMediaSearchParams(request);

    const mediaList = await mediaService.getMediaList({
      search: search ?? undefined,
      limit,
      offset,
    });

    return NextResponse.json(mediaList);
  } catch (error) {
    return handleApiError(error, ERROR_IDS.MEDIA_LIST_FAILED, "fetch media");
  }
};

export const POST = async (request: Request) => {
  const authResult = await requireAuth("upload media");
  if (!authResult.success) return authResult.response;

  const bodyResult = await parseAndValidateBody(request, confirmUploadSchema);
  if (!bodyResult.success) return bodyResult.response;

  try {
    const created = await mediaService.confirmUpload({
      ...bodyResult.data,
      uploadedById: authResult.data.user.id,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      logError(ERROR_IDS.MEDIA_CONFIRM_FAILED, error, {
        key: bodyResult.data.key,
      });
      return conflictResponse("media item", "key");
    }

    return handleApiError(
      error,
      ERROR_IDS.MEDIA_CONFIRM_FAILED,
      "confirm upload",
      { filename: bodyResult.data.filename },
    );
  }
};
