import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { getEmployeeDetail } from "./actions";
import { EmployeeDetailCharts } from "./charts";

export default async function EmployeeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string; days?: string }>;
}) {
  const { id } = await params;
  const q = await searchParams;
  const days = q.days ? parseInt(q.days, 10) : 14;
  const data = await getEmployeeDetail(id, {
    from: q.from,
    to: q.to,
    days: Number.isFinite(days) ? days : 14,
  });

  if (!data) notFound();

  const { user, summary, sessions, hoursPerDay, rawEvents } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/employees">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{user.name}</h1>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.todayHours} h</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">This week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.weekHours} h</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">This month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.monthHours} h</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hours per day (last 14 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <EmployeeDetailCharts hoursPerDay={hoursPerDay} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sessions</CardTitle>
          <CardDescription>Session list for selected range</CardDescription>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center">No sessions in range.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((s, i) => (
                  <TableRow key={i}>
                    <TableCell>{format(new Date(s.start), "PPp")}</TableCell>
                    <TableCell>{format(new Date(s.end), "PPp")}</TableCell>
                    <TableCell>{(s.durationMinutes / 60).toFixed(1)} h</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Raw events (debug)</CardTitle>
        </CardHeader>
        <CardContent>
          {rawEvents.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center">No events in range.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rawEvents.map((e, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs">
                      {format(new Date(e.timestamp), "PPpp")}
                    </TableCell>
                    <TableCell>{e.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

