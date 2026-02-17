import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDuration } from "@/lib/utils";
import { getOverviewStats } from "./actions";
import { OverviewChartWrapper } from "./overview-chart";

async function StatsCards() {
  const data = await getOverviewStats(30);
  const totalMinutesToday = data.totalHoursToday * 60;
  const avgMinutes = data.averageHoursToday * 60;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Currently in office</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.currentInOffice}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Total hours today</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatDuration(totalMinutesToday)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Active employees</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.activeEmployeesCount}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Avg hours today</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatDuration(avgMinutes)}</div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DashboardOverviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground">Presence and working time at a glance.</p>
      </div>
      <Suspense fallback={<CardsSkeleton />}>
        <StatsCards />
      </Suspense>
      <Card>
        <CardHeader>
          <CardTitle>Total hours per day (last 30 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="h-[300px] animate-pulse rounded bg-muted" />}>
            <OverviewChartWrapper />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

function CardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          </CardHeader>
          <CardContent>
            <div className="h-8 w-16 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
