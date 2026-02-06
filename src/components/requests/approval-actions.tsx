"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { REQUEST_STATUS } from "@/lib/constants";
import { Send, CheckCircle, Undo2 } from "lucide-react";

interface ApprovalStep {
  id: string;
  stepOrder: number;
  status: string;
  approvedBy: string | null;
  approvedAt: string | null;
  kickBackReason: string | null;
  approver: {
    id: string;
    name: string;
    title: string;
    delegates: { id: string; delegateName: string; isActive: boolean }[];
  };
}

interface ApprovalActionsProps {
  requestId: string;
  requestStatus: string;
  approvalSteps: ApprovalStep[];
}

export function ApprovalActions({ requestId, requestStatus, approvalSteps }: ApprovalActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Submit dialog state
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitterName, setSubmitterName] = useState("");

  // Approve dialog state
  const [approveOpen, setApproveOpen] = useState(false);
  const [approveIdentity, setApproveIdentity] = useState("");

  // Kick-back dialog state
  const [kickBackOpen, setKickBackOpen] = useState(false);
  const [kickBackIdentity, setKickBackIdentity] = useState("");
  const [kickBackToStep, setKickBackToStep] = useState("");
  const [kickBackReason, setKickBackReason] = useState("");

  // Approver selection for approve/kick-back
  const [approvers, setApprovers] = useState<{ id: string; name: string; title: string; delegates: { delegateName: string; isActive: boolean }[] }[]>([]);

  useEffect(() => {
    fetch("/api/approvers")
      .then((r) => r.json())
      .then((data) => {
        if (data.data) setApprovers(data.data);
      })
      .catch(() => {});
  }, []);

  const currentPendingStep = approvalSteps
    .filter((s) => s.status === "PENDING")
    .sort((a, b) => a.stepOrder - b.stepOrder)[0];

  const canSubmit = requestStatus === REQUEST_STATUS.DRAFT || requestStatus === REQUEST_STATUS.KICKED_BACK;
  const canApprove = requestStatus === REQUEST_STATUS.PENDING_APPROVAL && currentPendingStep;

  async function handleSubmit() {
    if (!submitterName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/requests/${requestId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submittedBy: submitterName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit");
      setSubmitOpen(false);
      setSubmitterName("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    if (!currentPendingStep || !approveIdentity) return;
    setLoading(true);
    setError(null);
    try {
      const isDelegate = approveIdentity !== currentPendingStep.approver.name;
      const res = await fetch(`/api/requests/${requestId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          approverId: currentPendingStep.approver.id,
          actingAs: isDelegate ? approveIdentity : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to approve");
      setApproveOpen(false);
      setApproveIdentity("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleKickBack() {
    if (!currentPendingStep || !kickBackIdentity || !kickBackToStep) return;
    setLoading(true);
    setError(null);
    try {
      const isDelegate = kickBackIdentity !== currentPendingStep.approver.name;
      const res = await fetch(`/api/requests/${requestId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "kick_back",
          approverId: currentPendingStep.approver.id,
          kickBackToStep: parseInt(kickBackToStep, 10),
          reason: kickBackReason.trim() || undefined,
          actingAs: isDelegate ? kickBackIdentity : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to kick back");
      setKickBackOpen(false);
      setKickBackIdentity("");
      setKickBackToStep("");
      setKickBackReason("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  // Build the list of valid identities for the current pending approver
  const approverIdentities: string[] = [];
  if (currentPendingStep) {
    approverIdentities.push(currentPendingStep.approver.name);
    for (const d of currentPendingStep.approver.delegates) {
      if (d.isActive) approverIdentities.push(d.delegateName);
    }
  }

  // Steps that can be kicked back to (all steps before and including the current one)
  const kickBackTargets = approvalSteps
    .filter((s) => currentPendingStep && s.stepOrder <= currentPendingStep.stepOrder)
    .sort((a, b) => a.stepOrder - b.stepOrder);

  if (!canSubmit && !canApprove) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {canSubmit && (
          <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
            <DialogTrigger asChild>
              <Button className="w-full" variant="default">
                <Send className="mr-2 h-4 w-4" />
                {requestStatus === REQUEST_STATUS.KICKED_BACK ? "Resubmit for Approval" : "Submit for Approval"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Submit for Approval</DialogTitle>
                <DialogDescription>
                  This will send the request through the approval chain. Enter your name to submit.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="submitter-name">Your Name</Label>
                  <Input
                    id="submitter-name"
                    value={submitterName}
                    onChange={(e) => setSubmitterName(e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSubmitOpen(false)} disabled={loading}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={loading || !submitterName.trim()}>
                  {loading ? "Submitting..." : "Submit"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {canApprove && (
          <>
            <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
              <DialogTrigger asChild>
                <Button className="w-full" variant="default">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve (Step {currentPendingStep.stepOrder})
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Approve Request</DialogTitle>
                  <DialogDescription>
                    Approving as step {currentPendingStep.stepOrder}: {currentPendingStep.approver.name} ({currentPendingStep.approver.title})
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Who is approving?</Label>
                    <Select value={approveIdentity} onValueChange={setApproveIdentity}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your identity" />
                      </SelectTrigger>
                      <SelectContent>
                        {approverIdentities.map((name) => (
                          <SelectItem key={name} value={name}>
                            {name}
                            {name !== currentPendingStep.approver.name && " (delegate)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setApproveOpen(false)} disabled={loading}>
                    Cancel
                  </Button>
                  <Button onClick={handleApprove} disabled={loading || !approveIdentity}>
                    {loading ? "Approving..." : "Approve"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={kickBackOpen} onOpenChange={setKickBackOpen}>
              <DialogTrigger asChild>
                <Button className="w-full" variant="outline">
                  <Undo2 className="mr-2 h-4 w-4" />
                  Kick Back
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Kick Back Request</DialogTitle>
                  <DialogDescription>
                    Send this request back to an earlier step in the approval chain. All approvals from that step onward will be reset.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Who is kicking back?</Label>
                    <Select value={kickBackIdentity} onValueChange={setKickBackIdentity}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your identity" />
                      </SelectTrigger>
                      <SelectContent>
                        {approverIdentities.map((name) => (
                          <SelectItem key={name} value={name}>
                            {name}
                            {name !== currentPendingStep.approver.name && " (delegate)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Kick back to step</Label>
                    <Select value={kickBackToStep} onValueChange={setKickBackToStep}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a step" />
                      </SelectTrigger>
                      <SelectContent>
                        {kickBackTargets.map((step) => (
                          <SelectItem key={step.id} value={String(step.stepOrder)}>
                            Step {step.stepOrder}: {step.approver.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="kick-back-reason">Reason (optional)</Label>
                    <Textarea
                      id="kick-back-reason"
                      value={kickBackReason}
                      onChange={(e) => setKickBackReason(e.target.value)}
                      placeholder="Why is this being kicked back?"
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setKickBackOpen(false)} disabled={loading}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleKickBack}
                    disabled={loading || !kickBackIdentity || !kickBackToStep}
                  >
                    {loading ? "Processing..." : "Kick Back"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </CardContent>
    </Card>
  );
}
