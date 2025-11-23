"use cache";

import { Suspense } from "react";
import { Referrers } from "@/app/(blog)/analytics/_components/referrers";
import VisitsChart from "@/app/(blog)/analytics/_components/visits-chart";
import { DashboardMetrics } from "@/app/(blog)/dashboard/_components/dashboard-metrics";
import { PageTitle } from "@/components/shared/page-title";

const Dashboard = async () => {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <PageTitle
        title="Dashboard"
        description="📊 Just sharing a quick snapshot of a few personal wins and milestones I've hit along the way—it's been a fun ride so far!"
        className="flex flex-col gap-4"
      />
      <Suspense fallback={null}>
        <DashboardMetrics />
      </Suspense>
      <VisitsChart />
      <Suspense>
        <Referrers />
      </Suspense>
    </div>
  );
};

export default Dashboard;
