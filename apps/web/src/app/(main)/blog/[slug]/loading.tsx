import { Skeleton } from "@heroui/react";
import { SurfaceCard } from "@/app/components/surface-card";

export default function PostLoading() {
  return (
    <SurfaceCard className="flex flex-col gap-8">
      <div role="status" aria-label="Loading article">
        <div aria-hidden="true" className="flex flex-col gap-4">
          <Skeleton className="h-4 w-48 rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    </SurfaceCard>
  );
}
