"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { useDropdownOptions } from "@/hooks/use-dropdown-options";
import { toast } from "@/hooks/use-toast";
import { USER_ROLE } from "@/lib/constants";

const EMPTY_SELECT_VALUE = "__none__";

interface UserFormProps {
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    buildingId: string | null;
    positionId: string | null;
    role: string;
    isApprover: boolean;
  } | null;
  onClose: () => void;
  onSaved: () => void;
}

export function UserForm({ user, onClose, onSaved }: UserFormProps) {
  const isEdit = !!user;
  const { options, isLoading: optionsLoading, refetch } = useDropdownOptions();
  const [saving, setSaving] = useState(false);

  const [email, setEmail] = useState(user?.email ?? "");
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [buildingId, setBuildingId] = useState(user?.buildingId ?? "");
  const [positionId, setPositionId] = useState(user?.positionId ?? "");
  const [role, setRole] = useState(user?.role ?? "USER");
  const [makeApprover, setMakeApprover] = useState(user?.isApprover ?? false);

  // Get the selected position's label for the approver title
  const selectedPositionLabel = (options.position ?? []).find(
    (opt) => opt.id === positionId
  )?.label;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!email.trim()) {
      toast({
        title: "Validation Error",
        description: "Email is required.",
        variant: "destructive",
      });
      return;
    }

    if (makeApprover && !positionId) {
      toast({
        title: "Validation Error",
        description: "A position is required when adding to the approval chain.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, string | boolean | null> = {
        firstName: firstName.trim() || null,
        lastName: lastName.trim() || null,
        buildingId: buildingId || null,
        positionId: positionId || null,
        role,
        makeApprover,
      };

      if (!isEdit) {
        body.email = email.trim();
      }

      const url = isEdit ? `/api/users/${user!.id}` : "/api/users";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || `Failed to ${isEdit ? "update" : "create"} user`);
      }

      toast({
        title: isEdit ? "User Updated" : "User Created",
        description: isEdit
          ? "User has been updated."
          : `${email} has been added.`,
      });

      onSaved();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit User" : "Add User"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="uf-firstName">First Name</Label>
              <Input
                id="uf-firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="uf-lastName">Last Name</Label>
              <Input
                id="uf-lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="uf-email">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="uf-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              disabled={isEdit}
              required
            />
          </div>

          {!optionsLoading && (
            <>
              <div className="space-y-2">
                <Label>Building</Label>
                <Select
                  value={buildingId || EMPTY_SELECT_VALUE}
                  onValueChange={(v) => setBuildingId(v === EMPTY_SELECT_VALUE ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select building" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EMPTY_SELECT_VALUE}>-- None --</SelectItem>
                    {(options.location ?? []).map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Position</Label>
                <Combobox
                  options={(options.position ?? []).map((opt) => ({ id: opt.id, label: opt.label }))}
                  value={positionId}
                  onValueChange={setPositionId}
                  placeholder="Select position"
                  onAddNew={async (label) => {
                    let categoryId: string | undefined = options.position?.[0]?.categoryId;
                    if (!categoryId) {
                      const catRes = await fetch("/api/dropdowns");
                      const catJson = await catRes.json();
                      const posCat = (catJson.data as { id: string; name: string }[]).find(
                        (c) => c.name === "position"
                      );
                      categoryId = posCat?.id;
                    }
                    if (!categoryId) return null;
                    const res = await fetch("/api/dropdowns/options/suggest", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ categoryId, label }),
                    });
                    if (!res.ok) {
                      const json = await res.json();
                      toast({
                        title: "Error",
                        description: json.error || "Failed to add position",
                        variant: "destructive",
                      });
                      return null;
                    }
                    const json = await res.json();
                    await refetch();
                    return json.data.id;
                  }}
                  addNewLabel="Add new position..."
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(USER_ROLE).map(([, value]) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 border-t pt-4">
            <div className="flex items-center gap-2">
              <input
                id="uf-makeApprover"
                type="checkbox"
                checked={makeApprover}
                onChange={(e) => setMakeApprover(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="uf-makeApprover" className="cursor-pointer">
                Add to approval chain
              </Label>
            </div>
            {makeApprover && (
              <p className="text-xs text-muted-foreground">
                {selectedPositionLabel
                  ? `Will appear in the approval chain as "${selectedPositionLabel}".`
                  : "Select a position above — it will be used as the approver title."}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : isEdit ? "Save Changes" : "Add User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
