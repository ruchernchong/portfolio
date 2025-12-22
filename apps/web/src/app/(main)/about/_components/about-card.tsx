"use client";

import { ExperienceCard } from "@web/app/(main)/about/_components/experience-card";
import { LocationCard } from "@web/app/(main)/about/_components/location-card";
import { Typography } from "@web/components/typography";
import { Button } from "@web/components/ui/button";
import Link from "next/link";

export const AboutCard = () => {
  return (
    <div className="flex flex-col items-center gap-6">
      <Typography variant="h2">About Me</Typography>
      <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 md:items-start">
        <div className="grid gap-4">
          <LocationCard />
        </div>
        <div className="grid gap-4">
          <ExperienceCard />
        </div>
      </div>
      <div className="flex items-center justify-center">
        <Button
          variant="ghost"
          nativeButton={false}
          render={<Link href="/about" />}
        >
          More About Me
        </Button>
      </div>
    </div>
  );
};
