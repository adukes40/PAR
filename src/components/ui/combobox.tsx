"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComboboxOption {
  id: string;
  label: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  onAddNew?: (label: string) => Promise<string | null>;
  addNewLabel?: string;
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Select...",
  onAddNew,
  addNewLabel = "Add new position...",
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const newInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.id === value);

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setOpen(false);
      setIsAdding(false);
      setSearch("");
    }
  }, []);

  useEffect(() => {
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, handleClickOutside]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    if (isAdding && newInputRef.current) {
      newInputRef.current.focus();
    }
  }, [isAdding]);

  async function handleAddNew() {
    if (!newLabel.trim() || !onAddNew) return;
    setSubmitting(true);
    try {
      const newId = await onAddNew(newLabel.trim());
      if (newId) {
        onValueChange(newId);
        setIsAdding(false);
        setNewLabel("");
        setOpen(false);
        setSearch("");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          !selectedOption && "text-muted-foreground"
        )}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
          <div className="p-2">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
            />
          </div>

          <div ref={listRef} className="max-h-60 overflow-y-auto">
            {/* Clear selection option */}
            <button
              type="button"
              onClick={() => {
                onValueChange("");
                setOpen(false);
                setSearch("");
              }}
              className={cn(
                "relative flex w-full cursor-pointer select-none items-center px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground",
                !value && "bg-accent"
              )}
            >
              <span className="text-muted-foreground">-- Select --</span>
            </button>

            {filtered.length === 0 && (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                No results found.
              </div>
            )}

            {filtered.map((option) => (
              <button
                type="button"
                key={option.id}
                onClick={() => {
                  onValueChange(option.id);
                  setOpen(false);
                  setSearch("");
                }}
                className={cn(
                  "relative flex w-full cursor-pointer select-none items-center px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground",
                  value === option.id && "bg-accent"
                )}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4 shrink-0",
                    value === option.id ? "opacity-100" : "opacity-0"
                  )}
                />
                <span className="truncate">{option.label}</span>
              </button>
            ))}
          </div>

          {/* Add New section */}
          {onAddNew && (
            <div className="border-t p-2">
              {isAdding ? (
                <div className="flex gap-2">
                  <input
                    ref={newInputRef}
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddNew();
                      }
                      if (e.key === "Escape") {
                        setIsAdding(false);
                        setNewLabel("");
                      }
                    }}
                    placeholder="Enter name..."
                    disabled={submitting}
                    className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={handleAddNew}
                    disabled={submitting || !newLabel.trim()}
                    className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {submitting ? "..." : "Add"}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAdding(true)}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  <Plus className="h-4 w-4" />
                  {addNewLabel}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
