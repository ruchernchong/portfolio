import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const POST = async (req, { params }) => {
  const slug = params.slug;

  if (!slug) {
    return NextResponse.json(handleInvalidSlug(), { status: 400 });
  }

  const views = await getViewsBySlug(slug);

  await updateViews(slug, views);

  return NextResponse.json({ views: views + 1 });
};

export const GET = async (req, { params }) => {
  const slug = params.slug;

  if (!slug) {
    return NextResponse.json(handleInvalidSlug(), { status: 400 });
  }

  const views = await getViewsBySlug(slug);

  return NextResponse.json({ views });
};

const handleInvalidSlug = () => {
  return {
    error: "Invalid slug",
  };
};

const getViewsBySlug = async (slug: string) => {
  const data = await prisma.views.findMany({
    where: {
      slug: { equals: slug },
    },
  });

  return data.length === 0 ? 0 : data[0].count;
};

const updateViews = async (slug: string, count: number) => {
  return await prisma.views.upsert({
    where: { slug },
    create: { slug, count: 1 },
    update: { count: count + 1 },
  });
};

const Response = {
  json: (data: any, options?: { status?: number }) => ({
    body: JSON.stringify(data),
    status: options?.status || 200,
  }),
};