"use client";

import { useEffect, useState } from "react";
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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MoreHorizontal, Plus, UserPlus } from "lucide-react";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [resetPasswordId, setResetPasswordId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "EMPLOYEE",
  });
  const [resetPassword, setResetPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function fetchUsers() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to load users");
      const data = await res.json();
      setUsers(data.users ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error loading users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create user");
      setAddOpen(false);
      setAddForm({ name: "", email: "", password: "", role: "EMPLOYEE" });
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(user: User) {
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      if (!res.ok) throw new Error("Failed to update");
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
  }

  async function handleResetPassword() {
    if (!resetPasswordId || !resetPassword || resetPassword.length < 8) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${resetPasswordId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetPassword }),
      });
      if (!res.ok) throw new Error("Failed to reset password");
      setResetPasswordId(null);
      setResetPassword("");
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${deleteId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      setDeleteId(null);
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">Manage admin and employee accounts.</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add user
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 text-destructive px-4 py-2 text-sm">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All users</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground py-8 text-center">Loading…</p>
          ) : users.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">No users yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.role}</TableCell>
                    <TableCell>
                      <span
                        className={
                          u.isActive
                            ? "text-green-600 font-medium"
                            : "text-muted-foreground"
                        }
                      >
                        {u.isActive ? "Active" : "Disabled"}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(u.createdAt), "PP")}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleToggleActive(u)}
                          >
                            {u.isActive ? "Disable" : "Enable"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setResetPasswordId(u.id);
                              setResetPassword("");
                            }}
                          >
                            Reset password
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteId(u.id)}
                          >
                            Soft delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add user</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={addForm.name}
                onChange={(e) =>
                  setAddForm((p) => ({ ...p, name: e.target.value }))
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={addForm.email}
                onChange={(e) =>
                  setAddForm((p) => ({ ...p, email: e.target.value }))
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password (min 8)</Label>
              <Input
                id="password"
                type="password"
                value={addForm.password}
                onChange={(e) =>
                  setAddForm((p) => ({ ...p, password: e.target.value }))
                }
                required
                minLength={8}
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select
                value={addForm.role}
                onValueChange={(v) =>
                  setAddForm((p) => ({ ...p, role: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMPLOYEE">Employee</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={resetPasswordId != null}
        onOpenChange={(open) => !open && setResetPasswordId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset password</AlertDialogTitle>
            <AlertDialogDescription>
              Enter a new temporary password (min 8 characters).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              type="password"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              minLength={8}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleResetPassword();
              }}
              disabled={resetPassword.length < 8 || submitting}
            >
              {submitting ? "Saving…" : "Save"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteId != null}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Soft delete user</AlertDialogTitle>
            <AlertDialogDescription>
              The user will be deactivated and marked as deleted. They will not
              be able to log in. This action can be reversed by an admin
              re-enabling the account (if you add that feature).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={submitting}
            >
              {submitting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
