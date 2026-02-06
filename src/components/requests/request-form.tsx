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
import { useDropdownOptions } from "@/hooks/use-dropdown-options";
import { toast } from "@/hooks/use-toast";
import {
  REQUEST_TYPE_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  POSITION_DURATION_LABELS,
} from "@/lib/constants";

interface RequestFormProps {
  mode: "create" | "edit";
  initialData?: {
    id: string;
    positionId: string | null;
    locationId: string | null;
    fundLineId: string | null;
    requestType: string;
    employmentType: string;
    positionDuration: string;
    newEmployeeName: string | null;
    startDate: string | null;
    replacedPerson: string | null;
    notes: string | null;
    submittedBy: string | null;
    status: string;
  };
}

const EMPTY_SELECT_VALUE = "__none__";

export function RequestForm({ mode, initialData }: RequestFormProps) {
  const router = useRouter();
  const { options, isLoading: optionsLoading } = useDropdownOptions();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    positionId: initialData?.positionId ?? "",
    locationId: initialData?.locationId ?? "",
    fundLineId: initialData?.fundLineId ?? "",
    requestType: initialData?.requestType ?? "",
    employmentType: initialData?.employmentType ?? "",
    positionDuration: initialData?.positionDuration ?? "",
    newEmployeeName: initialData?.newEmployeeName ?? "",
    startDate: initialData?.startDate ?? "",
    replacedPerson: initialData?.replacedPerson ?? "",
    notes: initialData?.notes ?? "",
    submittedBy: initialData?.submittedBy ?? "",
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
                <Select
                  value={formData.positionId || EMPTY_SELECT_VALUE}
                  onValueChange={(v) => handleChange("positionId", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select position" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EMPTY_SELECT_VALUE}>-- Select --</SelectItem>
                    {(options.position ?? []).map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              <div className="space-y-2">
                <Label>
                  New / Replacement <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.requestType || EMPTY_SELECT_VALUE}
                  onValueChange={(v) => handleChange("requestType", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EMPTY_SELECT_VALUE}>-- Select --</SelectItem>
                    {Object.entries(REQUEST_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Employment Type */}
              <div className="space-y-2">
                <Label>
                  Full or Part Time <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.employmentType || EMPTY_SELECT_VALUE}
                  onValueChange={(v) => handleChange("employmentType", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employment type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EMPTY_SELECT_VALUE}>-- Select --</SelectItem>
                    {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Position Duration */}
              <div className="space-y-2">
                <Label>
                  Temporary or Regular <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.positionDuration || EMPTY_SELECT_VALUE}
                  onValueChange={(v) => handleChange("positionDuration", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EMPTY_SELECT_VALUE}>-- Select --</SelectItem>
                    {Object.entries(POSITION_DURATION_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleChange("startDate", e.target.value)}
                />
              </div>
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
          </CardContent>
        </Card>

        {/* Submitter & Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="submittedBy">Submitted By</Label>
              <Input
                id="submittedBy"
                value={formData.submittedBy}
                onChange={(e) => handleChange("submittedBy", e.target.value)}
                placeholder="Your name"
              />
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
