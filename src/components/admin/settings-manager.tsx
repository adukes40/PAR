"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

export function SettingsManager() {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [secretIsSet, setSecretIsSet] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Google Workspace fields
  const [serviceAccountKey, setServiceAccountKey] = useState("");
  const [serviceAccountKeyIsSet, setServiceAccountKeyIsSet] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [groupAdmins, setGroupAdmins] = useState("paradmins@cr.k12.de.us");
  const [groupHR, setGroupHR] = useState("parhrusers@cr.k12.de.us");
  const [groupAuthorizers, setGroupAuthorizers] = useState("parauthorizers@cr.k12.de.us");
  const [groupUsers, setGroupUsers] = useState("parusers@cr.k12.de.us");
  const [savingWorkspace, setSavingWorkspace] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/settings");
        if (!res.ok) throw new Error("Failed to load settings");
        const json = await res.json();
        setClientId(json.data.google_client_id ?? "");
        setSecretIsSet(json.data.google_client_secret_set ?? false);
        // Google Workspace fields
        setServiceAccountKeyIsSet(json.data.google_service_account_key_set ?? false);
        setAdminEmail(json.data.google_admin_email ?? "");
        if (json.data.google_group_admins) setGroupAdmins(json.data.google_group_admins);
        if (json.data.google_group_hr) setGroupHR(json.data.google_group_hr);
        if (json.data.google_group_authorizers) setGroupAuthorizers(json.data.google_group_authorizers);
        if (json.data.google_group_users) setGroupUsers(json.data.google_group_users);
      } catch (err) {
        toast({
          title: "Error",
          description:
            err instanceof Error ? err.message : "Failed to load settings",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSaveOAuth() {
    setSaving(true);
    try {
      const body: Record<string, string> = {
        google_client_id: clientId,
      };
      if (clientSecret) {
        body.google_client_secret = clientSecret;
      }

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to save settings");
      }

      const json = await res.json();
      toast({ title: "Settings saved", description: json.data.message });

      if (clientSecret) {
        setSecretIsSet(true);
        setClientSecret("");
      }
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveWorkspace() {
    setSavingWorkspace(true);
    try {
      const body: Record<string, string> = {
        google_admin_email: adminEmail,
        google_group_admins: groupAdmins,
        google_group_hr: groupHR,
        google_group_authorizers: groupAuthorizers,
        google_group_users: groupUsers,
      };
      if (serviceAccountKey) {
        body.google_service_account_key = serviceAccountKey;
      }

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to save settings");
      }

      toast({ title: "Settings saved", description: "Google Workspace settings updated." });

      if (serviceAccountKey) {
        setServiceAccountKeyIsSet(true);
        setServiceAccountKey("");
      }
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSavingWorkspace(false);
    }
  }

  async function handleTestConnection() {
    setTesting(true);
    try {
      const res = await fetch("/api/settings/test-google", { method: "POST" });
      const json = await res.json();
      if (json.data?.success) {
        toast({ title: "Connection successful", description: json.data.message });
      } else {
        toast({
          title: "Connection failed",
          description: json.data?.message || "Test failed",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Connection test failed",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Loading settings...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Google OAuth</CardTitle>
          <CardDescription>
            Configure Google OAuth credentials to enable &quot;Sign in with
            Google&quot; for your users. After saving, restart the container (
            <code className="text-xs bg-muted px-1 py-0.5 rounded">
              docker compose up --build -d
            </code>
            ) for changes to take effect.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-w-lg">
            <div className="space-y-2">
              <Label htmlFor="google-client-id">Client ID</Label>
              <Input
                id="google-client-id"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="xxxxxxxxxxxx.apps.googleusercontent.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="google-client-secret">Client Secret</Label>
              <Input
                id="google-client-secret"
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder={secretIsSet ? "••••••••  (already set)" : "Enter client secret"}
              />
              {secretIsSet && !clientSecret && (
                <p className="text-xs text-muted-foreground">
                  A secret is already saved. Enter a new value to replace it.
                </p>
              )}
            </div>

            <Button onClick={handleSaveOAuth} disabled={saving || !clientId.trim()}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Google Workspace Integration</CardTitle>
          <CardDescription>
            Configure Google Admin SDK service account for group-based access control.
            Only members of the configured Google Groups will be able to sign in,
            and their roles will be derived from group membership.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-w-lg">
            <div className="space-y-2">
              <Label htmlFor="service-account-key">Service Account Key JSON</Label>
              <Textarea
                id="service-account-key"
                value={serviceAccountKey}
                onChange={(e) => setServiceAccountKey(e.target.value)}
                placeholder={serviceAccountKeyIsSet ? "••••••••  (already set — enter new value to replace)" : "Paste service account JSON key here..."}
                rows={4}
                className="font-mono text-xs"
              />
              {serviceAccountKeyIsSet && !serviceAccountKey && (
                <p className="text-xs text-muted-foreground">
                  A service account key is already saved. Enter a new value to replace it.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-email">Admin Email (for impersonation)</Label>
              <Input
                id="admin-email"
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@yourdomain.com"
              />
              <p className="text-xs text-muted-foreground">
                A Google Workspace admin email. The service account will impersonate this user for Admin SDK calls.
              </p>
            </div>

            <div className="border-t pt-4 space-y-4">
              <p className="text-sm font-medium">Google Group Emails</p>

              <div className="space-y-2">
                <Label htmlFor="group-admins">PAR Admins Group</Label>
                <Input
                  id="group-admins"
                  type="email"
                  value={groupAdmins}
                  onChange={(e) => setGroupAdmins(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="group-hr">PAR HR Group</Label>
                <Input
                  id="group-hr"
                  type="email"
                  value={groupHR}
                  onChange={(e) => setGroupHR(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="group-authorizers">PAR Authorizers Group</Label>
                <Input
                  id="group-authorizers"
                  type="email"
                  value={groupAuthorizers}
                  onChange={(e) => setGroupAuthorizers(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="group-users">PAR Users Group</Label>
                <Input
                  id="group-users"
                  type="email"
                  value={groupUsers}
                  onChange={(e) => setGroupUsers(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleSaveWorkspace} disabled={savingWorkspace}>
                {savingWorkspace ? "Saving..." : "Save"}
              </Button>
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={testing || !serviceAccountKeyIsSet}
              >
                {testing ? "Testing..." : "Test Connection"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
