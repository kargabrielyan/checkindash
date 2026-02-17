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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getEmployees } from "./actions";

function StatusBadge({ status }: { status: string }) {
  if (status === "IN_OFFICE") return <Badge className="bg-green-600">In office</Badge>;
  if (status === "OUT_OF_OFFICE") return <Badge variant="secondary">Out</Badge>;
  return <Badge variant="outline">Unknown</Badge>;
}

export default async function EmployeesPage() {
  const { employees } = await getEmployees();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Employees</h1>
        <p className="text-muted-foreground">Presence and hours per employee.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All employees</CardTitle>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">No employees yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Current status</TableHead>
                  <TableHead>Last seen</TableHead>
                  <TableHead>Today (h)</TableHead>
                  <TableHead>Week (h)</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.name}</TableCell>
                    <TableCell><StatusBadge status={e.currentStatus} /></TableCell>
                    <TableCell className="text-muted-foreground">
                      {e.lastSeen ? format(new Date(e.lastSeen), "PPp") : "—"}
                    </TableCell>
                    <TableCell>{e.todayHours}</TableCell>
                    <TableCell>{e.weekHours}</TableCell>
                    <TableCell>
                      <Link
                        href={`/dashboard/employees/${e.id}`}
                        className="text-primary hover:underline text-sm"
                      >
                        Details
                      </Link>
                    </TableCell>
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
