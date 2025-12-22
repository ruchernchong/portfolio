import { OG_SIZE } from "@web/lib/og/config";
import { getOGFonts } from "@web/lib/og/fonts";
import { Section } from "@web/lib/og/templates/section";
import { ImageResponse } from "next/og";

export const alt = "Projects - Ru Chern";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const fonts = await getOGFonts();

  return new ImageResponse(
    <Section
      title="Projects"
      description="A showcase of completed projects and experiments with new technologies"
    />,
    {
      ...size,
      fonts,
    },
  );
}
