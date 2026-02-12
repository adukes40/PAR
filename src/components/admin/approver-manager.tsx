"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Pencil,
  Trash2,
  UserPlus,
  X,
  Users,
  GripVertical,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Delegate {
  id: string;
  delegateName: string;
  delegateEmail: string | null;
  isActive: boolean;
}

interface Approver {
  id: string;
  name: string;
  title: string;
  email: string | null;
  sortOrder: number;
  isActive: boolean;
  delegates: Delegate[];
}

interface ApproverManagerProps {
  approvers: Approver[];
}

export function ApproverManager({ approvers: initialApprovers }: ApproverManagerProps) {
  const [approvers, setApprovers] = useState(initialApprovers);
  const [isAdding, setIsAdding] = useState(false);
  const [editingApprover, setEditingApprover] = useState<Approver | null>(null);
  const [addingDelegateTo, setAddingDelegateTo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state for adding approver
  const [newName, setNewName] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newEmail, setNewEmail] = useState("");

  // Form state for editing approver
  const [editName, setEditName] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editEmail, setEditEmail] = useState("");

  // Drag-and-drop state
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // Form state for adding delegate
  const [delegateName, setDelegateName] = useState("");
  const [delegateEmail, setDelegateEmail] = useState("");

  const activeApprovers = approvers
    .filter((a) => a.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const inactiveApprovers = approvers.filter((a) => !a.isActive);

  async function refreshApprovers() {
    const res = await fetch("/api/approvers");
    if (res.ok) {
      const json = await res.json();
      setApprovers(json.data);
    }
  }

  async function handleAddApprover() {
    if (!newName.trim() || !newTitle.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/approvers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          title: newTitle.trim(),
          email: newEmail.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to add approver");
      }

      toast({ title: "Approver added", description: `${newName.trim()} has been added to the approval chain.` });
      setNewName("");
      setNewTitle("");
      setNewEmail("");
      setIsAdding(false);
      await refreshApprovers();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add approver",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdateApprover() {
    if (!editingApprover || !editName.trim() || !editTitle.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/approvers/${editingApprover.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          title: editTitle.trim(),
          email: editEmail.trim() || "",
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to update approver");
      }

      toast({ title: "Approver updated" });
      setEditingApprover(null);
      await refreshApprovers();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update approver",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeactivate(approver: Approver) {
    try {
      const res = await fetch(`/api/approvers/${approver.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to deactivate approver");
      }

      toast({ title: "Approver deactivated", description: `${approver.name} has been removed from the approval chain.` });
      await refreshApprovers();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to deactivate",
        variant: "destructive",
      });
    }
  }

  async function handleReactivate(approver: Approver) {
    try {
      const res = await fetch(`/api/approvers/${approver.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });

      if (!res.ok) throw new Error("Failed to reactivate");

      toast({ title: "Approver reactivated" });
      await refreshApprovers();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reactivate",
        variant: "destructive",
      });
    }
  }

  const handleDragEnd = useCallback(async () => {
    const from = dragItem.current;
    const to = dragOverItem.current;
    dragItem.current = null;
    dragOverItem.current = null;
    setDragIndex(null);

    if (from === null || to === null || from === to) return;

    const newOrder = activeApprovers.map((a) => a.id);
    const [moved] = newOrder.splice(from, 1);
    newOrder.splice(to, 0, moved);

    try {
      const res = await fetch("/api/approvers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reorder", approverIds: newOrder }),
      });

      if (!res.ok) throw new Error("Failed to reorder");

      await refreshApprovers();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reorder",
        variant: "destructive",
      });
    }
  }, [activeApprovers]);

  async function handleAddDelegate() {
    if (!addingDelegateTo || !delegateName.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/approvers/${addingDelegateTo}/delegates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          delegateName: delegateName.trim(),
          delegateEmail: delegateEmail.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to add delegate");
      }

      toast({ title: "Delegate added" });
      setDelegateName("");
      setDelegateEmail("");
      setAddingDelegateTo(null);
      await refreshApprovers();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add delegate",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemoveDelegate(delegateId: string, approverId: string) {
    try {
      const res = await fetch(`/api/approvers/${approverId}/delegates`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delegateId }),
      });

      if (!res.ok) throw new Error("Failed to remove delegate");

      toast({ title: "Delegate removed" });
      await refreshApprovers();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove delegate",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Dialog open={isAdding} onOpenChange={setIsAdding}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Approver
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Approver</DialogTitle>
              <DialogDescription>
                Add a new person to the approval chain. They will be added at the end of the current chain.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Dr. Jane Smith"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Director of Human Resources"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email (optional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g., jsmith@crsd.org"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
              <Button onClick={handleAddApprover} disabled={isSubmitting || !newName.trim() || !newTitle.trim()}>
                {isSubmitting ? "Adding..." : "Add Approver"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Approvers */}
      <div className="rounded-lg border bg-card">
        <div className="border-b p-4">
          <h3 className="font-semibold">Approval Chain Order</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Requests will be routed to these approvers in the order shown below.
          </p>
        </div>

        <div className="divide-y">
          {activeApprovers.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              No approvers configured. Add one using the button above.
            </div>
          )}
          {activeApprovers.map((approver, index) => (
            <div
              key={approver.id}
              draggable
              onDragStart={() => {
                dragItem.current = index;
                setDragIndex(index);
              }}
              onDragEnter={() => {
                dragOverItem.current = index;
              }}
              onDragOver={(e) => e.preventDefault()}
              onDragEnd={handleDragEnd}
              className={
                "p-4" +
                (dragIndex === index ? " opacity-50" : "")
              }
            >
              <div className="flex items-center gap-3">
                <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab active:cursor-grabbing shrink-0" />
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
                  {index + 1}
                </div>

                <div className="flex-1">
                  <div className="font-medium">{approver.name}</div>
                  <div className="text-sm text-muted-foreground">{approver.title}</div>
                  {approver.email && (
                    <div className="text-xs text-muted-foreground">{approver.email}</div>
                  )}
                </div>

                <div className="flex items-center gap-1">

                  {/* Edit */}
                  <Dialog
                    open={editingApprover?.id === approver.id}
                    onOpenChange={(open) => {
                      if (!open) setEditingApprover(null);
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          setEditingApprover(approver);
                          setEditName(approver.name);
                          setEditTitle(approver.title);
                          setEditEmail(approver.email ?? "");
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Approver</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Name</Label>
                          <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Title</Label>
                          <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Email (optional)</Label>
                          <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingApprover(null)}>Cancel</Button>
                        <Button onClick={handleUpdateApprover} disabled={isSubmitting || !editName.trim() || !editTitle.trim()}>
                          {isSubmitting ? "Saving..." : "Save"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {/* Add Delegate */}
                  <Dialog
                    open={addingDelegateTo === approver.id}
                    onOpenChange={(open) => {
                      if (!open) {
                        setAddingDelegateTo(null);
                        setDelegateName("");
                        setDelegateEmail("");
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setAddingDelegateTo(approver.id)}
                      >
                        <UserPlus className="h-3 w-3" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Delegate for {approver.name}</DialogTitle>
                        <DialogDescription>
                          Delegates can approve requests on behalf of {approver.name}.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Delegate Name</Label>
                          <Input
                            value={delegateName}
                            onChange={(e) => setDelegateName(e.target.value)}
                            placeholder="e.g., John Doe"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Email (optional)</Label>
                          <Input
                            type="email"
                            value={delegateEmail}
                            onChange={(e) => setDelegateEmail(e.target.value)}
                            placeholder="e.g., jdoe@crsd.org"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setAddingDelegateTo(null)}>Cancel</Button>
                        <Button onClick={handleAddDelegate} disabled={isSubmitting || !delegateName.trim()}>
                          {isSubmitting ? "Adding..." : "Add Delegate"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {/* Deactivate */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove Approver</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove {approver.name} from the approval chain. In-flight
                          requests with existing approval steps will not be affected. You can
                          reactivate them later.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeactivate(approver)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              {/* Delegates */}
              {approver.delegates.length > 0 && (
                <div className="mt-3 ml-11 space-y-1">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    Delegates:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {approver.delegates.map((delegate) => (
                      <Badge key={delegate.id} variant="secondary" className="gap-1">
                        {delegate.delegateName}
                        <button
                          onClick={() => handleRemoveDelegate(delegate.id, approver.id)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Inactive Approvers */}
      {inactiveApprovers.length > 0 && (
        <div className="rounded-lg border bg-card">
          <div className="border-b p-4 bg-muted/30">
            <h3 className="text-sm font-medium text-muted-foreground">
              Inactive Approvers ({inactiveApprovers.length})
            </h3>
          </div>
          <div className="divide-y">
            {inactiveApprovers.map((approver) => (
              <div key={approver.id} className="flex items-center justify-between p-4 opacity-60">
                <div>
                  <div className="font-medium line-through">{approver.name}</div>
                  <div className="text-sm text-muted-foreground">{approver.title}</div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleReactivate(approver)}>
                  Reactivate
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
