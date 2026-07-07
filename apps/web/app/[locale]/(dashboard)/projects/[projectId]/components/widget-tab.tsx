"use client";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
  Badge,
  Input,
  Skeleton,
} from "@chatbot/ui";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Check,
  Plus,
  X,
  Code,
  Copy,
  CheckCheck,
  Smartphone,
  KeyRound,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";

import { type Project } from "@/contexts/project-context";
import { apiClient } from "@/lib/api-client";
import {
  buildWidgetEmbedCode,
  WIDGET_API_URL,
  WIDGET_SCRIPT_URL,
} from "@/lib/widget-embed";

interface WidgetTabProps {
  project: Project;
}

interface ClientKey {
  id: string;
  key: string;
  platform: string;
  name: string | null;
  active: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}

export function WidgetTab({ project }: WidgetTabProps) {
  const t = useTranslations("dashboard.pages.embed");
  const [success, setSuccess] = useState<string | null>(null);

  // Domain whitelist state
  const [allowedDomains, setAllowedDomains] = useState<string[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [domainError, setDomainError] = useState<string | null>(null);
  const [savingDomains, setSavingDomains] = useState(false);
  const [loadingDomains, setLoadingDomains] = useState(true);

  // Embed code state
  const [embedCopied, setEmbedCopied] = useState(false);

  // Mobile SDK client keys state
  const [clientKeys, setClientKeys] = useState<ClientKey[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [creatingKey, setCreatingKey] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  // Fetch allowed domains when project changes
  useEffect(() => {
    const fetchAllowedDomains = async () => {
      if (!project) {
        setLoadingDomains(false);
        return;
      }
      setLoadingDomains(true);
      try {
        const response = await apiClient<{ domains: string[]; enabled: boolean }>(
          `/api/projects/${project.id}/allowed-domains`
        );
        setAllowedDomains(response.domains || []);
      } catch (err) {
        console.error("Failed to fetch allowed domains:", err);
        setAllowedDomains([]);
      } finally {
        setLoadingDomains(false);
      }
    };
    fetchAllowedDomains();
  }, [project]);

  // Fetch mobile SDK client keys when project changes
  useEffect(() => {
    const fetchKeys = async () => {
      if (!project) {
        setLoadingKeys(false);
        return;
      }
      setLoadingKeys(true);
      try {
        const res = await apiClient<{ keys: ClientKey[] }>(
          `/api/projects/${project.id}/client-keys`
        );
        setClientKeys(res.keys || []);
      } catch (err) {
        console.error("Failed to fetch client keys:", err);
        setClientKeys([]);
      } finally {
        setLoadingKeys(false);
      }
    };
    fetchKeys();
  }, [project]);

  // Mobile SDK key handlers
  const handleCreateKey = async () => {
    setCreatingKey(true);
    try {
      const res = await apiClient<{ key: ClientKey }>(
        `/api/projects/${project.id}/client-keys`,
        { method: "POST", body: JSON.stringify({ platform: "mobile" }) }
      );
      setClientKeys((keys) => [res.key, ...keys]);
      setSuccess(t("mobileKeyGenerated"));
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Failed to create client key:", err);
    } finally {
      setCreatingKey(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    try {
      await apiClient(`/api/projects/${project.id}/client-keys/${keyId}`, {
        method: "DELETE",
      });
      setClientKeys((keys) => keys.filter((k) => k.id !== keyId));
      setSuccess(t("keyRevoked"));
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Failed to revoke client key:", err);
    }
  };

  const handleCopyKey = (key: ClientKey) => {
    navigator.clipboard.writeText(key.key);
    setCopiedKeyId(key.id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  // Domain whitelist handlers
  const handleAddDomain = () => {
    const domain = newDomain.trim().toLowerCase();

    if (!domain) return;

    const domainRegex = /^(\*\.)?[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/;
    if (!domainRegex.test(domain)) {
      setDomainError(t("invalidDomain"));
      return;
    }

    if (allowedDomains.includes(domain)) {
      setDomainError(t("domainAlreadyAdded"));
      return;
    }

    setAllowedDomains([...allowedDomains, domain]);
    setNewDomain("");
    setDomainError(null);
  };

  const handleRemoveDomain = (domain: string) => {
    setAllowedDomains(allowedDomains.filter((d) => d !== domain));
  };

  const handleSaveDomains = async () => {
    setSavingDomains(true);
    setDomainError(null);

    const domainsToSave = [...allowedDomains];
    if (newDomain.trim()) {
      const domain = newDomain.trim().toLowerCase();
      const domainRegex = /^(\*\.)?[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/;

      if (!domainRegex.test(domain)) {
        setDomainError(t("invalidDomain"));
        setSavingDomains(false);
        return;
      }

      if (!domainsToSave.includes(domain)) {
        domainsToSave.push(domain);
        setAllowedDomains(domainsToSave);
        setNewDomain("");
      }
    }

    try {
      await apiClient(`/api/projects/${project.id}/allowed-domains`, {
        method: "PUT",
        body: JSON.stringify({ domains: domainsToSave }),
      });
      setSuccess(
        domainsToSave.length > 0
          ? t("domainsUpdated", { count: domainsToSave.length })
          : t("domainsDisabled")
      );
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("saveDomainError");
      setDomainError(message);
    } finally {
      setSavingDomains(false);
    }
  };

  const getEmbedCode = () => {
    return buildWidgetEmbedCode({
      projectId: project.id,
      apiUrl: WIDGET_API_URL,
      scriptUrl: WIDGET_SCRIPT_URL,
    });
  };

  const handleCopyEmbed = () => {
    navigator.clipboard.writeText(getEmbedCode());
    setEmbedCopied(true);
    setTimeout(() => setEmbedCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {success && (
        <div className="flex items-center gap-2 p-4 rounded-md bg-green-500/10 text-green-600">
          <Check className="h-4 w-4" />
          <p>{success}</p>
        </div>
      )}

      {/* Embed Code */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            {t("embedCode")}
          </CardTitle>
          <CardDescription>{t("embedDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto max-h-32">{getEmbedCode()}</pre>
            <Button
              size="sm"
              variant="secondary"
              className="absolute top-2 end-2 gap-1"
              onClick={handleCopyEmbed}
            >
              {embedCopied ? (
                <>
                  <CheckCheck className="h-3 w-3" />
                  {t("copied")}
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  {t("copy")}
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("pasteBeforeBody")}
          </p>
        </CardContent>
      </Card>

      {/* Domain Whitelist */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t("domainWhitelist")}
          </CardTitle>
          <CardDescription>
            {t("domainWhitelistDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingDomains ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-4 w-48" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Current Domains */}
              {allowedDomains.length > 0 && (
                <div className="space-y-2">
                  <Label>{t("allowedDomains")}</Label>
                  <div className="flex flex-wrap gap-2">
                    {allowedDomains.map((domain) => (
                      <Badge key={domain} variant="secondary" className="flex items-center gap-1 px-3 py-1">
                        {domain}
                        <button onClick={() => handleRemoveDomain(domain)} className="ms-1 hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Domain Input */}
              <div className="space-y-2">
                <Label htmlFor="new-domain">{t("addDomain")}</Label>
                <div className="flex gap-2">
                  <Input
                    id="new-domain"
                    value={newDomain}
                    onChange={(e) => {
                      setNewDomain(e.target.value);
                      setDomainError(null);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleAddDomain()}
                    placeholder={t("domainPlaceholder")}
                    className="flex-1"
                  />
                  <Button variant="outline" onClick={handleAddDomain} disabled={!newDomain.trim()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {domainError && <p className="text-sm text-destructive">{domainError}</p>}
                <p className="text-xs text-muted-foreground">
                  {t("domainHelp")}
                </p>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                {allowedDomains.length > 0 ? (
                  <>
                    <ShieldCheck className="h-4 w-4 text-green-500" />
                    <span className="text-sm">
                      {t("restrictedStatus", { count: allowedDomains.length })}
                    </span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm">{t("openStatus")}</span>
                  </>
                )}
              </div>

              <div className="pt-2">
                <Button onClick={handleSaveDomains} disabled={savingDomains}>
                  {savingDomains && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                  {savingDomains ? t("saving") : t("saveDomainSettings")}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mobile SDK keys */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            {t("mobileSdk")}
          </CardTitle>
          <CardDescription>
            {t("mobileSdkDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingKeys ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-4 w-48" />
            </div>
          ) : (
            <div className="space-y-4">
              {clientKeys.filter((k) => k.active).length > 0 ? (
                <div className="space-y-2">
                  {clientKeys
                    .filter((k) => k.active)
                    .map((k) => (
                      <div
                        key={k.id}
                        className="flex items-center gap-2 rounded-md border p-2"
                      >
                        <KeyRound className="h-4 w-4 text-muted-foreground shrink-0" />
                        <code className="flex-1 truncate text-xs">{k.key}</code>
                        <Badge variant="secondary">{k.platform}</Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopyKey(k)}
                          aria-label={t("copyKeyLabel")}
                        >
                          {copiedKeyId === k.id ? (
                            <CheckCheck className="h-3 w-3" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => handleRevokeKey(k.id)}
                          aria-label={t("revokeKeyLabel")}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("noMobileKeys")}
                </p>
              )}

              <Button onClick={handleCreateKey} disabled={creatingKey}>
                {creatingKey ? (
                  <Loader2 className="h-4 w-4 me-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 me-2" />
                )}
                {creatingKey ? t("generating") : t("generateMobileKey")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
