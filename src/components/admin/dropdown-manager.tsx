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
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, RotateCcw, GripVertical, ListPlus, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface DropdownOption {
  id: string;
  label: string;
  value: string;
  sortOrder: number;
  isActive: boolean;
  needsReview: boolean;
  categoryId: string;
}

interface DropdownCategory {
  id: string;
  name: string;
  label: string;
  options: DropdownOption[];
}

interface DropdownManagerProps {
  categories: DropdownCategory[];
}

export function DropdownManager({ categories: initialCategories }: DropdownManagerProps) {
  const [categories, setCategories] = useState(initialCategories);
  const [selectedCategory, setSelectedCategory] = useState<string>(
    initialCategories[0]?.id ?? ""
  );
  const [isAddingOption, setIsAddingOption] = useState(false);
  const [newOptionLabel, setNewOptionLabel] = useState("");
  const [isBulkAdding, setIsBulkAdding] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [editingOption, setEditingOption] = useState<DropdownOption | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reactivatePrompt, setReactivatePrompt] = useState<DropdownOption | null>(null);

  // Drag-and-drop state
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const currentCategory = categories.find((c) => c.id === selectedCategory);

  async function refreshCategories() {
    const res = await fetch("/api/dropdowns");
    if (res.ok) {
      const json = await res.json();
      setCategories(json.data);
    }
  }

  async function handleAddOption() {
    if (!newOptionLabel.trim() || !selectedCategory) return;

    // Check if label matches an inactive option (case-insensitive)
    const inactiveMatch = currentCategory?.options.find(
      (o) => !o.isActive && o.label.toLowerCase() === newOptionLabel.trim().toLowerCase()
    );
    if (inactiveMatch) {
      setIsAddingOption(false);
      setNewOptionLabel("");
      setReactivatePrompt(inactiveMatch);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/dropdowns/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: selectedCategory,
          label: newOptionLabel.trim(),
        }),
      });

      if (!res.ok) {
        const json = await res.json();

        // API detected an inactive duplicate — show reactivate prompt
        if (json.code === "INACTIVE_DUPLICATE" && json.inactiveOption) {
          setIsAddingOption(false);
          setNewOptionLabel("");
          setReactivatePrompt({
            id: json.inactiveOption.id,
            label: json.inactiveOption.label,
            value: "",
            sortOrder: 0,
            isActive: false,
            needsReview: false,
            categoryId: selectedCategory,
          });
          return;
        }

        throw new Error(json.error || "Failed to add option");
      }

      toast({ title: "Option added", description: `"${newOptionLabel.trim()}" has been added.` });
      setNewOptionLabel("");
      setIsAddingOption(false);
      await refreshCategories();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add option",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleBulkAdd() {
    if (!bulkText.trim() || !selectedCategory) return;

    const labels = bulkText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (labels.length === 0) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/dropdowns/options/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: selectedCategory, labels }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to add options");
      }

      const json = await res.json();
      const { created, skipped, skippedLabels } = json.data;

      let description = `${created} option${created !== 1 ? "s" : ""} added.`;
      if (skipped > 0) {
        description += ` ${skipped} skipped (already exist): ${skippedLabels.join(", ")}`;
      }

      toast({ title: "Bulk add complete", description });
      setBulkText("");
      setIsBulkAdding(false);
      await refreshCategories();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add options",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdateOption() {
    if (!editingOption || !editLabel.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/dropdowns/options/${editingOption.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: editLabel.trim() }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to update option");
      }

      toast({ title: "Option updated" });
      setEditingOption(null);
      setEditLabel("");
      await refreshCategories();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update option",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeactivate(option: DropdownOption) {
    try {
      const res = await fetch(`/api/dropdowns/options/${option.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to deactivate option");
      }

      toast({ title: "Option deactivated", description: `"${option.label}" has been deactivated.` });
      await refreshCategories();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to deactivate option",
        variant: "destructive",
      });
    }
  }

  async function handleReactivate(option: DropdownOption) {
    try {
      const res = await fetch(`/api/dropdowns/options/${option.id}?reactivate=true`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to reactivate option");
      }

      toast({ title: "Option reactivated", description: `"${option.label}" has been reactivated.` });
      await refreshCategories();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reactivate option",
        variant: "destructive",
      });
    }
  }

  async function handleApproveOption(option: DropdownOption) {
    try {
      const res = await fetch(`/api/dropdowns/options/${option.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ needsReview: false }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to approve option");
      }

      toast({ title: "Option approved", description: `"${option.label}" has been reviewed.` });
      await refreshCategories();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to approve option",
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

    if (from === null || to === null || from === to || !currentCategory) return;

    const sorted = [...currentCategory.options]
      .filter((o) => o.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const newOrder = sorted.map((o) => o.id);
    const [moved] = newOrder.splice(from, 1);
    newOrder.splice(to, 0, moved);

    try {
      const res = await fetch("/api/dropdowns/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: selectedCategory,
          optionIds: newOrder,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to reorder");
      }

      await refreshCategories();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reorder options",
        variant: "destructive",
      });
    }
  }, [currentCategory, selectedCategory]);

  const activeOptions = currentCategory?.options
    .filter((o) => o.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder) ?? [];

  const inactiveOptions = currentCategory?.options
    .filter((o) => !o.isActive)
    .sort((a, b) => a.label.localeCompare(b.label)) ?? [];

  return (
    <div className="space-y-6">
      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <Button
            key={cat.id}
            variant={selectedCategory === cat.id ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(cat.id)}
          >
            {cat.label}
            <Badge variant="secondary" className="ml-2">
              {cat.options.filter((o) => o.isActive).length}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Options List */}
      {currentCategory && (
        <div className="rounded-lg border bg-card">
          <div className="flex items-center justify-between border-b p-4">
            <h3 className="font-semibold">{currentCategory.label} Options</h3>
            <div className="flex gap-2">
            <Dialog open={isBulkAdding} onOpenChange={setIsBulkAdding}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <ListPlus className="mr-2 h-4 w-4" />
                  Bulk Add
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Bulk Add {currentCategory.label} Options</DialogTitle>
                  <DialogDescription>
                    Enter one option per line. Duplicates will be skipped.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="bulkLabels">Options (one per line)</Label>
                    <Textarea
                      id="bulkLabels"
                      value={bulkText}
                      onChange={(e) => setBulkText(e.target.value)}
                      placeholder={`Enter ${currentCategory.label.toLowerCase()} names, one per line...\nExample Option 1\nExample Option 2\nExample Option 3`}
                      rows={10}
                    />
                    {bulkText.trim() && (
                      <p className="text-xs text-muted-foreground">
                        {bulkText.split("\n").filter((l) => l.trim()).length} option(s) to add
                      </p>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsBulkAdding(false);
                      setBulkText("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleBulkAdd} disabled={isSubmitting || !bulkText.trim()}>
                    {isSubmitting ? "Adding..." : "Add All"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={isAddingOption} onOpenChange={setIsAddingOption}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Option
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add {currentCategory.label} Option</DialogTitle>
                  <DialogDescription>
                    Add a new option to the {currentCategory.label.toLowerCase()} dropdown list.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="optionLabel">Label</Label>
                    <Input
                      id="optionLabel"
                      value={newOptionLabel}
                      onChange={(e) => setNewOptionLabel(e.target.value)}
                      placeholder={`Enter ${currentCategory.label.toLowerCase()} name`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddOption();
                      }}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAddingOption(false);
                      setNewOptionLabel("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleAddOption} disabled={isSubmitting || !newOptionLabel.trim()}>
                    {isSubmitting ? "Adding..." : "Add Option"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            </div>
          </div>

          {/* Active Options */}
          <div className="divide-y">
            {activeOptions.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                No active options. Add one using the button above.
              </div>
            )}
            {activeOptions.map((option, index) => (
              <div
                key={option.id}
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
                  "flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors" +
                  (dragIndex === index ? " opacity-50" : "")
                }
              >
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing shrink-0" />
                <span className="flex-1 text-sm">{option.label}</span>
                {option.needsReview && (
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-xs">
                      Needs Review
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-green-700 hover:text-green-800 hover:bg-green-50"
                      onClick={() => handleApproveOption(option)}
                    >
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Approve
                    </Button>
                  </div>
                )}

                <div className="flex items-center gap-1">
                  {/* Edit */}
                  <Dialog
                    open={editingOption?.id === option.id}
                    onOpenChange={(open) => {
                      if (!open) {
                        setEditingOption(null);
                        setEditLabel("");
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          setEditingOption(option);
                          setEditLabel(option.label);
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Option</DialogTitle>
                        <DialogDescription>Update the display label for this option.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="editLabel">Label</Label>
                          <Input
                            id="editLabel"
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleUpdateOption();
                            }}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEditingOption(null);
                            setEditLabel("");
                          }}
                        >
                          Cancel
                        </Button>
                        <Button onClick={handleUpdateOption} disabled={isSubmitting || !editLabel.trim()}>
                          {isSubmitting ? "Saving..." : "Save"}
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
                        <AlertDialogTitle>Deactivate Option</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will hide &quot;{option.label}&quot; from dropdown lists. Existing requests
                          using this option will not be affected. You can reactivate it later.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeactivate(option)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Deactivate
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>

          {/* Inactive Options */}
          {inactiveOptions.length > 0 && (
            <div className="border-t">
              <div className="px-4 py-2 bg-muted/30">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Inactive Options ({inactiveOptions.length})
                </h4>
              </div>
              <div className="divide-y">
                {inactiveOptions.map((option) => (
                  <div
                    key={option.id}
                    className="flex items-center gap-3 px-4 py-3 opacity-60"
                  >
                    <span className="flex-1 text-sm line-through">{option.label}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReactivate(option)}
                    >
                      <RotateCcw className="mr-1 h-3 w-3" />
                      Reactivate
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reactivate Prompt */}
      <AlertDialog
        open={reactivatePrompt !== null}
        onOpenChange={(open) => { if (!open) setReactivatePrompt(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reactivate Option</AlertDialogTitle>
            <AlertDialogDescription>
              That field already exists, but is deactivated. Would you like to reactivate
              the field &quot;{reactivatePrompt?.label}&quot;?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setReactivatePrompt(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (reactivatePrompt) {
                  handleReactivate(reactivatePrompt);
                  setReactivatePrompt(null);
                }
              }}
            >
              Reactivate Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
