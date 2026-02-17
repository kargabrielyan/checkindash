import { getOverviewStats } from "./actions";
import { OverviewChartClient } from "./overview-chart-client";

export async function OverviewChartWrapper() {
  const { hoursPerDay } = await getOverviewStats(30);
  return <OverviewChartClient hoursPerDay={hoursPerDay} />;
}
