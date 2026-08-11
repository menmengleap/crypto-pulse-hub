import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, Panel } from "@/components/common/primitives";
import { CodeBlock } from "@/components/common/CodeBlock";
import { createApiKey, fetchApiKeys, revokeApiKey } from "@/lib/api/indicators";
import { ApiRequestError } from "@/lib/api/client";
import { API_CONFIGURED } from "@/lib/api/config";

export const Route = createFileRoute("/_app/api-keys")({
  head: () => ({
    meta: [
      { title: "API keys — Cryptolytic API" },
      {
        name: "description",
        content:
          "Create, inspect and revoke the API keys your applications use to call the indicator engine.",
      },
      { property: "og:title", content: "API keys — Cryptolytic API" },
      {
        property: "og:description",
        content: "Manage credentials for the Cryptolytic indicator API.",
      },
    ],
  }),
  component: ApiKeysPage,
});

function ApiKeysPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [secret, setSecret] = useState<string | null>(null);

  const keys = useQuery({
    queryKey: ["api-keys"],
    queryFn: fetchApiKeys,
    enabled: API_CONFIGURED,
    retry: false,
  });

  const create = useMutation({
    mutationFn: () => createApiKey(name.trim()),
    onSuccess: (key) => {
      setName("");
      setSecret(key.secret ?? null);
      toast.success("API key created");
      void queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (error) =>
      toast.error(error instanceof ApiRequestError ? error.message : "Could not create the key"),
  });

  const revoke = useMutation({
    mutationFn: revokeApiKey,
    onSuccess: () => {
      toast.success("API key revoked");
      void queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (error) =>
      toast.error(error instanceof ApiRequestError ? error.message : "Could not revoke the key"),
  });

  return (
    <div className="space-y-8">
      <header>
        <p className="mono-label">Credentials</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">API keys</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Keys are issued and stored by your API. Secrets are shown once, at creation.
        </p>
      </header>

      <Panel className="p-4">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim()) {
              toast.error("Give the key a name");
              return;
            }
            create.mutate();
          }}
          className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"
        >
          <div className="min-w-0">
            <label htmlFor="key-name" className="mono-label">
              Key name
            </label>
            <input
              id="key-name"
              value={name}
              maxLength={64}
              onChange={(event) => setName(event.target.value)}
              placeholder="production-bot"
              className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus:border-border-strong focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={create.isPending}
            className="mt-2 inline-flex h-10 shrink-0 items-center gap-2 self-end rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Create key
          </button>
        </form>
      </Panel>

      {secret && (
        <Panel className="p-4">
          <p className="mono-label">Copy your secret now</p>
          <p className="mt-2 text-xs text-muted-foreground">
            This value is only returned once by the API.
          </p>
          <CodeBlock className="mt-3 border-0" code={secret} maxHeight="6rem" />
        </Panel>
      )}

      {!API_CONFIGURED || keys.isError ? (
        <EmptyState
          icon={<KeyRound className="h-4 w-4" />}
          title="No keys available"
          description={
            !API_CONFIGURED
              ? "Set VITE_API_BASE_URL to your Indicator API host to manage keys."
              : keys.error instanceof ApiRequestError
                ? keys.error.message
                : "Keys could not be loaded."
          }
        />
      ) : keys.data && keys.data.length > 0 ? (
        <div className="panel divide-y divide-border overflow-hidden">
          {keys.data.map((key) => (
            <div
              key={key.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-foreground">{key.name}</p>
                <p className="mt-1 truncate font-mono text-[11px] text-subtle">
                  {key.maskedKey} · {key.status}
                  {key.lastUsedAt ? ` · last used ${key.lastUsedAt}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => revoke.mutate(key.id)}
                disabled={key.status === "revoked" || revoke.isPending}
                className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md border border-border px-3 text-xs text-muted-foreground transition-colors hover:border-destructive/60 hover:text-destructive disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                Revoke
              </button>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<KeyRound className="h-4 w-4" />}
          title="No API keys yet"
          description="Create your first key above to start authenticating requests."
        />
      )}
    </div>
  );
}
