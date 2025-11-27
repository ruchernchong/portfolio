"use client";

import { CodeBracketIcon, StarIcon } from "@heroicons/react/24/solid";
import { SiGithub } from "@icons-pack/react-simple-icons";
import { ChartColumnIncreasing } from "lucide-react";
import { MetricCard } from "@/app/(blog)/analytics/_components/metric-card";
import { trpc } from "@/trpc/client";

export const DashboardMetrics = () => {
  const { data: totalVisits, isLoading: totalVisitsLoading } =
    trpc.analytics.getTotalVisits.useQuery();
  const { data: followers, isLoading: followersLoading } =
    trpc.github.getFollowers.useQuery();
  const { data: stars, isLoading: starsLoading } =
    trpc.github.getStars.useQuery();
  const { data: contributions, isLoading: contributionsLoading } =
    trpc.github.getContributions.useQuery();

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <MetricCard
        title="Total Site Visits"
        value={totalVisitsLoading ? "..." : (totalVisits ?? 0)}
        icon={<ChartColumnIncreasing />}
      />
      <MetricCard
        title="GitHub Followers"
        value={followersLoading ? "..." : (followers ?? 0)}
        icon={<SiGithub className="size-8" />}
      />
      <MetricCard
        title="GitHub Stars"
        value={starsLoading ? "..." : (stars ?? 0)}
        icon={<StarIcon className="size-8" />}
      />
      <MetricCard
        title="Total Commits"
        value={
          contributionsLoading
            ? "..."
            : (contributions?.contributionsCollection
                .totalCommitContributions ?? 0)
        }
        icon={<CodeBracketIcon className="size-8" />}
      />
    </div>
  );
};
