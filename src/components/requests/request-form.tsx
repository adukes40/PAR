"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { useDropdownOptions } from "@/hooks/use-dropdown-options";
import { toast } from "@/hooks/use-toast";
import {
  REQUEST_TYPE_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  POSITION_DURATION_LABELS,
} from "@/lib/constants";

interface RequestFormProps {
  mode: "create" | "edit";
  defaultBuildingId?: string | null;
  initialData?: {
    id: string;
    positionId: string | null;
    locationId: string | null;
    fundLineId: string | null;
    requestType: string;
    employmentType: string;
    positionDuration: string;
    newEmployeeName: string | null;
    replacedPerson: string | null;
    notes: string | null;
    status: string;
  };
}

const EMPTY_SELECT_VALUE = "__none__";

export function RequestForm({ mode, initialData, defaultBuildingId }: RequestFormProps) {
  const router = useRouter();
  const { options, isLoading: optionsLoading, refetch } = useDropdownOptions();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    positionId: initialData?.positionId ?? "",
    locationId: initialData?.locationId ?? (mode === "create" && defaultBuildingId ? defaultBuildingId : ""),
    fundLineId: initialData?.fundLineId ?? "",
    requestType: initialData?.requestType ?? "",
    employmentType: initialData?.employmentType ?? "",
    positionDuration: initialData?.positionDuration ?? "",
    newEmployeeName: initialData?.newEmployeeName ?? "",
    replacedPerson: initialData?.replacedPerson ?? "",
    notes: initialData?.notes ?? "",
  });

  function handleChange(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value === EMPTY_SELECT_VALUE ? "" : value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.requestType || !formData.employmentType || !formData.positionDuration) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (Request Type, Employment Type, Position Duration).",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const url = mode === "create" ? "/api/requests" : `/api/requests/${initialData?.id}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || `Failed to ${mode} request`);
      }

      const json = await res.json();
      const requestId = json.data.id;

      toast({
        title: mode === "create" ? "Request Created" : "Request Updated",
        description: mode === "create"
          ? `Job ID: ${json.data.jobId}`
          : "Changes have been saved.",
      });

      router.push(`/requests/${requestId}`);
      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to ${mode} request`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (optionsLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Loading form options...
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        {/* Position Details */}
        <Card>
          <CardHeader>
            <CardTitle>Position Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Position */}
              <div className="space-y-2">
                <Label>Position</Label>
                <Combobox
                  options={(options.position ?? []).map((opt) => ({ id: opt.id, label: opt.label }))}
                  value={formData.positionId}
                  onValueChange={(v) => handleChange("positionId", v)}
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

              {/* Location */}
              <div className="space-y-2">
                <Label>Location</Label>
                <Select
                  value={formData.locationId || EMPTY_SELECT_VALUE}
                  onValueChange={(v) => handleChange("locationId", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EMPTY_SELECT_VALUE}>-- Select --</SelectItem>
                    {(options.location ?? []).map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Fund Line */}
              <div className="space-y-2">
                <Label>Fund Line(s)</Label>
                <Select
                  value={formData.fundLineId || EMPTY_SELECT_VALUE}
                  onValueChange={(v) => handleChange("fundLineId", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select fund line" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EMPTY_SELECT_VALUE}>-- Select --</SelectItem>
                    {(options.fund_line ?? []).map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Request Type */}
              <fieldset className="space-y-2">
                <Label asChild>
                  <legend>
                    New / Replacement <span className="text-destructive">*</span>
                  </legend>
                </Label>
                <div className="flex gap-4 pt-1">
                  {Object.entries(REQUEST_TYPE_LABELS).map(([value, label]) => (
                    <label key={value} className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="radio"
                        name="requestType"
                        value={value}
                        checked={formData.requestType === value}
                        onChange={(e) => handleChange("requestType", e.target.value)}
                        className="h-4 w-4 border-gray-300 text-primary focus:ring-ring"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>

              {/* Employment Type */}
              <fieldset className="space-y-2">
                <Label asChild>
                  <legend>
                    Full or Part Time <span className="text-destructive">*</span>
                  </legend>
                </Label>
                <div className="flex gap-4 pt-1">
                  {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([value, label]) => (
                    <label key={value} className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="radio"
                        name="employmentType"
                        value={value}
                        checked={formData.employmentType === value}
                        onChange={(e) => handleChange("employmentType", e.target.value)}
                        className="h-4 w-4 border-gray-300 text-primary focus:ring-ring"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>

              {/* Position Duration */}
              <fieldset className="space-y-2">
                <Label asChild>
                  <legend>
                    Temporary or Regular <span className="text-destructive">*</span>
                  </legend>
                </Label>
                <div className="flex gap-4 pt-1">
                  {Object.entries(POSITION_DURATION_LABELS).map(([value, label]) => (
                    <label key={value} className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="radio"
                        name="positionDuration"
                        value={value}
                        checked={formData.positionDuration === value}
                        onChange={(e) => handleChange("positionDuration", e.target.value)}
                        className="h-4 w-4 border-gray-300 text-primary focus:ring-ring"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          </CardContent>
        </Card>

        {/* Hiring Information */}
        <Card>
          <CardHeader>
            <CardTitle>Hiring Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newEmployeeName">New Employee Name</Label>
                <Input
                  id="newEmployeeName"
                  value={formData.newEmployeeName}
                  onChange={(e) => handleChange("newEmployeeName", e.target.value)}
                  placeholder="To be filled after hiring"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="replacedPerson">Person Being Replaced (when applicable)</Label>
                <Input
                  id="replacedPerson"
                  value={formData.replacedPerson}
                  onChange={(e) => handleChange("replacedPerson", e.target.value)}
                  placeholder="e.g., Crystal Branigan - tsf to DABM eff"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                placeholder="Any additional notes or context..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? mode === "create"
                ? "Creating..."
                : "Saving..."
              : mode === "create"
                ? "Create Request"
                : "Save Changes"}
          </Button>
        </div>
      </div>
    </form>
  );
}
