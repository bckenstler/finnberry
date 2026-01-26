"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { ArrowLeft, Trash2, UserMinus, UserPlus, Crown, Shield, Eye, Users } from "lucide-react";
import type { HouseholdRole } from "@finnberry/schemas";

const roleIcons: Record<HouseholdRole, React.ReactNode> = {
  OWNER: <Crown className="h-4 w-4 text-yellow-500" />,
  ADMIN: <Shield className="h-4 w-4 text-blue-500" />,
  CAREGIVER: <Users className="h-4 w-4 text-green-500" />,
  VIEWER: <Eye className="h-4 w-4 text-gray-500" />,
};

const roleLabels: Record<HouseholdRole, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  CAREGIVER: "Caregiver",
  VIEWER: "Viewer",
};

export default function HouseholdSettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const { data: households, isLoading } = trpc.household.list.useQuery();
  const household = households?.[0]; // Use first household

  const [name, setName] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<HouseholdRole>("CAREGIVER");
  const [removeMemberDialogOpen, setRemoveMemberDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{
    id: string;
    name: string | null;
  } | null>(null);

  // Initialize form when household data loads
  const hasInitialized = useState(false);
  if (household && !hasInitialized[0]) {
    setName(household.name);
    hasInitialized[1](true);
  }

  const updateHousehold = trpc.household.update.useMutation({
    onSuccess: () => {
      toast({ title: "Household updated!" });
      utils.household.list.invalidate();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteHousehold = trpc.household.delete.useMutation({
    onSuccess: () => {
      toast({ title: "Household deleted" });
      router.push("/dashboard");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const inviteMember = trpc.household.invite.useMutation({
    onSuccess: () => {
      toast({ title: "Invitation sent!" });
      setInviteDialogOpen(false);
      setInviteEmail("");
      setInviteRole("CAREGIVER");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMemberRole = trpc.household.updateMemberRole.useMutation({
    onSuccess: () => {
      toast({ title: "Role updated!" });
      utils.household.list.invalidate();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeMember = trpc.household.removeMember.useMutation({
    onSuccess: () => {
      toast({ title: "Member removed" });
      utils.household.list.invalidate();
      setRemoveMemberDialogOpen(false);
      setMemberToRemove(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (household && name.trim()) {
      updateHousehold.mutate({
        id: household.id,
        name: name.trim(),
      });
    }
  };

  const handleDelete = () => {
    if (household && confirmName === household.name) {
      deleteHousehold.mutate({ id: household.id });
    }
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (household && inviteEmail.trim()) {
      inviteMember.mutate({
        householdId: household.id,
        email: inviteEmail.trim(),
        role: inviteRole,
      });
    }
  };

  const handleRoleChange = (userId: string, role: HouseholdRole) => {
    if (household) {
      updateMemberRole.mutate({
        householdId: household.id,
        userId,
        role,
      });
    }
  };

  const handleRemoveMember = () => {
    if (household && memberToRemove) {
      removeMember.mutate({
        householdId: household.id,
        userId: memberToRemove.id,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!household) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <p className="text-muted-foreground">No household found</p>
        <Button asChild>
          <Link href="/dashboard/household/new">Create Household</Link>
        </Button>
      </div>
    );
  }

  const isOwner = household.role === "OWNER";
  const isAdmin = household.role === "ADMIN";
  const canManageMembers = isOwner || isAdmin;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/dashboard">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Household Settings</CardTitle>
          <CardDescription>
            Manage your household name and preferences.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Household Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={!canManageMembers}
              />
            </div>

            {canManageMembers && (
              <Button
                type="submit"
                className="w-full"
                disabled={updateHousehold.isPending}
              >
                {updateHousehold.isPending ? "Saving..." : "Save Changes"}
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Members</CardTitle>
            <CardDescription>
              {household.members.length} member
              {household.members.length !== 1 ? "s" : ""} in this household
            </CardDescription>
          </div>
          {canManageMembers && (
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Invite
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleInvite}>
                  <DialogHeader>
                    <DialogTitle>Invite Member</DialogTitle>
                    <DialogDescription>
                      Send an invitation to join your household.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="inviteEmail">Email</Label>
                      <Input
                        id="inviteEmail"
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="caregiver@example.com"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="inviteRole">Role</Label>
                      <Select
                        value={inviteRole}
                        onValueChange={(v) => setInviteRole(v as HouseholdRole)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                          <SelectItem value="CAREGIVER">Caregiver</SelectItem>
                          <SelectItem value="VIEWER">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setInviteDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={inviteMember.isPending}>
                      {inviteMember.isPending ? "Sending..." : "Send Invite"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {household.members.map((member) => (
              <div
                key={member.user.id}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.user.image || undefined} />
                    <AvatarFallback>
                      {member.user.name?.charAt(0) ||
                        member.user.email?.charAt(0) ||
                        "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {member.user.name || member.user.email}
                      </span>
                      {roleIcons[member.role as HouseholdRole]}
                    </div>
                    {member.user.name && (
                      <span className="text-sm text-muted-foreground">
                        {member.user.email}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isOwner && member.role !== "OWNER" && (
                    <Select
                      value={member.role}
                      onValueChange={(v) =>
                        handleRoleChange(member.user.id, v as HouseholdRole)
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="CAREGIVER">Caregiver</SelectItem>
                        <SelectItem value="VIEWER">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {member.role === "OWNER" && (
                    <span className="text-sm text-muted-foreground px-3">
                      {roleLabels[member.role]}
                    </span>
                  )}
                  {canManageMembers && member.role !== "OWNER" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setMemberToRemove({
                          id: member.user.id,
                          name: member.user.name,
                        });
                        setRemoveMemberDialogOpen(true);
                      }}
                    >
                      <UserMinus className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={removeMemberDialogOpen}
        onOpenChange={setRemoveMemberDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {memberToRemove?.name || "this member"} from the
              household?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRemoveMemberDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveMember}
              disabled={removeMember.isPending}
            >
              {removeMember.isPending ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isOwner && (
        <>
          <Separator />
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                Permanently delete this household and all children, records, and
                member associations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Household
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete {household.name}?</DialogTitle>
                    <DialogDescription>
                      This will permanently delete the household, all children,
                      and all tracking records. All members will lose access.
                      This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2">
                    <Label htmlFor="confirmHouseholdName">
                      Type &quot;{household.name}&quot; to confirm
                    </Label>
                    <Input
                      id="confirmHouseholdName"
                      value={confirmName}
                      onChange={(e) => setConfirmName(e.target.value)}
                      placeholder={household.name}
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setDeleteDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={
                        confirmName !== household.name ||
                        deleteHousehold.isPending
                      }
                    >
                      {deleteHousehold.isPending ? "Deleting..." : "Delete"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
