import { getSeriesById } from "@ruchernchong/database";
import { SeriesPostsManager } from "@web/app/studio/series/[id]/edit/_components/series-posts-manager";
import { SeriesForm } from "@web/components/studio/series-form";
import { notFound } from "next/navigation";

interface EditSeriesPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditSeriesPage({ params }: EditSeriesPageProps) {
  const { id } = await params;
  const series = await getSeriesById(id);

  if (!series) {
    notFound();
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <SeriesForm series={series} />
      <SeriesPostsManager seriesId={id} />
    </div>
  );
}
