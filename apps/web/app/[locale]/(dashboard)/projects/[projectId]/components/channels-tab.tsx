"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Badge,
} from "@chatbot/ui";
import { Loader2, Copy, Check, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { apiClient } from "@/lib/api-client";

interface ChannelConnection {
  id: string;
  provider: string;
  externalId: string;
  displayName: string | null;
  status: string;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

interface WhatsAppFormState {
  phoneNumberId: string;
  wabaId: string;
  accessToken: string;
  appSecret: string;
  displayName: string;
}

const EMPTY_FORM: WhatsAppFormState = {
  phoneNumberId: "",
  wabaId: "",
  accessToken: "",
  appSecret: "",
  displayName: "",
};

export function ChannelsTab({ projectId }: { projectId: string }) {
  const t = useTranslations("dashboard.pages.projectDetail.channels");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connection, setConnection] = useState<ChannelConnection | null>(null);
  const [form, setForm] = useState<WhatsAppFormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_URL || "https://api.frontface.app";
  const webhookUrl =
    `${apiBaseUrl.replace(/\/$/, "")}/api/channels/whatsapp/webhook`;

  const fetchConnection = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient<{ connections: ChannelConnection[] }>(
        `/api/projects/${projectId}/channels`
      );
      const whatsapp = data.connections.find((c) => c.provider === "whatsapp");
      setConnection(whatsapp ?? null);
    } catch {
      setError(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [projectId, t]);

  useEffect(() => {
    fetchConnection();
  }, [fetchConnection]);

  const handleConnect = async () => {
    setError(null);
    setSuccess(null);

    if (!form.phoneNumberId || !form.accessToken || !form.appSecret) {
      setError(t("requiredError"));
      return;
    }

    setSaving(true);
    try {
      await apiClient(`/api/projects/${projectId}/channels/whatsapp`, {
        method: "POST",
        body: JSON.stringify({
          phoneNumberId: form.phoneNumberId,
          wabaId: form.wabaId || undefined,
          accessToken: form.accessToken,
          appSecret: form.appSecret,
          displayName: form.displayName || undefined,
        }),
      });
      setSuccess(t("connectedSuccess"));
      setForm(EMPTY_FORM);
      await fetchConnection();
    } catch {
      setError(t("connectError"));
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setError(null);
    setSuccess(null);
    setTesting(true);
    try {
      const result = await apiClient<{ ok: boolean; error?: string }>(
        `/api/projects/${projectId}/channels/whatsapp/test`,
        { method: "POST" }
      );
      if (result.ok) {
        setSuccess(t("testPassed"));
      } else {
        setError(t("testFailed", { error: result.error ?? "" }));
      }
    } catch {
      setError(t("testError"));
    } finally {
      setTesting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!connection) return;
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      await apiClient(
        `/api/projects/${projectId}/channels/whatsapp/${connection.id}`,
        { method: "DELETE" }
      );
      setConnection(null);
      setSuccess(t("disconnected"));
    } catch {
      setError(t("disconnectError"));
    } finally {
      setSaving(false);
    }
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 text-sm text-green-600 bg-green-50 rounded-md border border-green-200">
          {success}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>WhatsApp</CardTitle>
              <CardDescription>
                {t("whatsappDescription")}
              </CardDescription>
            </div>
            {connection && (
              <Badge
                variant={connection.status === "active" ? "default" : "secondary"}
              >
                {connection.status === "active" ? t("connected") : connection.status}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {connection && connection.status === "active" ? (
            <div className="space-y-4">
              <div className="grid gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">{t("displayName")}</Label>
                  <p className="text-sm font-medium">
                    {connection.displayName || connection.externalId}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t("phoneNumberId")}</Label>
                  <p className="text-sm font-medium">{connection.externalId}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t("credentials")}</Label>
                  <p className="text-sm text-muted-foreground">••••••••</p>
                </div>
              </div>

              {/* Webhook URL */}
              <div className="p-3 bg-muted/50 rounded-md space-y-1">
                <Label className="text-xs text-muted-foreground">
                  {t("webhookUrl")}
                </Label>
                <div className="flex items-center gap-2">
                  <code className="text-xs flex-1 break-all">{webhookUrl}</code>
                  <Button variant="ghost" size="sm" onClick={copyWebhookUrl}>
                    {copied ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>

              {connection.lastError && (
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                  {t("lastError", { error: connection.lastError })}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleTest}
                  disabled={testing}
                >
                  {testing ? (
                    <Loader2 className="h-4 w-4 animate-spin me-2" />
                  ) : null}
                  {t("testConnection")}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDisconnect}
                  disabled={saving}
                >
                  {t("disconnect")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="displayName">{t("displayNameOptional")}</Label>
                  <Input
                    id="displayName"
                    placeholder={t("displayNamePlaceholder")}
                    value={form.displayName}
                    onChange={(e) =>
                      setForm({ ...form, displayName: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phoneNumberId">{t("phoneNumberIdRequired")}</Label>
                  <Input
                    id="phoneNumberId"
                    placeholder={t("phoneNumberIdPlaceholder")}
                    value={form.phoneNumberId}
                    onChange={(e) =>
                      setForm({ ...form, phoneNumberId: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="wabaId">{t("wabaIdOptional")}</Label>
                  <Input
                    id="wabaId"
                    placeholder={t("wabaIdPlaceholder")}
                    value={form.wabaId}
                    onChange={(e) =>
                      setForm({ ...form, wabaId: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="accessToken">{t("accessToken")}</Label>
                  <Input
                    id="accessToken"
                    type="password"
                    placeholder={t("accessTokenPlaceholder")}
                    value={form.accessToken}
                    onChange={(e) =>
                      setForm({ ...form, accessToken: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="appSecret">{t("appSecret")}</Label>
                  <Input
                    id="appSecret"
                    type="password"
                    placeholder={t("appSecretPlaceholder")}
                    value={form.appSecret}
                    onChange={(e) =>
                      setForm({ ...form, appSecret: e.target.value })
                    }
                  />
                </div>
              </div>

              <Button onClick={handleConnect} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin me-2" />
                ) : null}
                {t("connectWhatsapp")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
