"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { endpoints, type OpsNotification } from "@/lib/api";
import { propertyParam, queryKeys } from "@/lib/prefetch";
import { useApp } from "@/components/app-provider";
import { PageHeader } from "@/components/page-header";
import { PageTransition, Stagger, StaggerItem } from "@/components/ui/motion";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const statusTone = {
  pending: "warning",
  sent: "success",
  failed: "danger",
} as const;

export default function NotificationsPage() {
  const { propertyId } = useApp();
  const queryClient = useQueryClient();
  const pid = propertyParam(propertyId);

  const { data, isPending } = useQuery({
    queryKey: queryKeys.notifications(propertyId),
    queryFn: () => endpoints.notifications({ propertyId: pid }),
  });

  const { data: summary } = useQuery({
    queryKey: queryKeys.notificationSummary(propertyId),
    queryFn: () => endpoints.notificationSummary(pid),
  });

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    void queryClient.invalidateQueries({ queryKey: ["notification-summary"] });
  }

  const generate = useMutation({
    mutationFn: () => endpoints.generateNotifications(pid),
    onSuccess: invalidate,
  });

  const sendAll = useMutation({
    mutationFn: () => endpoints.sendAllNotifications(),
    onSuccess: invalidate,
  });

  const sendOne = useMutation({
    mutationFn: (id: string) => endpoints.sendNotification(id),
    onSuccess: invalidate,
  });

  return (
    <PageTransition>
      <PageHeader
        title="Notices"
        subtitle="Renewal and COI outreach queue — generate from due leases / insurance issues, then send email or SMS (demo log)."
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              disabled={generate.isPending}
              onClick={() => generate.mutate()}
            >
              {generate.isPending ? "Building…" : "Generate due notices"}
            </Button>
            <Button
              disabled={sendAll.isPending || !summary?.pending}
              onClick={() => sendAll.mutate()}
            >
              {sendAll.isPending
                ? "Sending…"
                : `Send all pending (${summary?.pending ?? 0})`}
            </Button>
          </div>
        }
      />

      <Stagger className="mb-5 grid gap-3 sm:grid-cols-3">
        <Stat label="Pending" value={String(summary?.pending ?? 0)} />
        <Stat label="Sent" value={String(summary?.sent ?? 0)} />
        <Stat label="Failed" value={String(summary?.failed ?? 0)} />
      </Stagger>

      {generate.isSuccess && (
        <p className="mb-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Created {generate.data.created} notice
          {generate.data.created === 1 ? "" : "s"}.
        </p>
      )}

      {isPending && !data ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <Card interactive={false} className="p-10 text-center">
          <p className="text-[var(--muted)]">
            No notices yet
            {propertyId !== "all" ? " for this yard" : ""}. Click “Generate due
            notices” to build renewal and COI messages.
          </p>
        </Card>
      ) : (
        <Stagger className="grid gap-3">
          {data.map((note) => (
            <StaggerItem key={note.id}>
              <NoticeCard
                note={note}
                sending={sendOne.isPending}
                onSend={() => sendOne.mutate(note.id)}
              />
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </PageTransition>
  );
}

function NoticeCard({
  note,
  onSend,
  sending,
}: {
  note: OpsNotification;
  onSend: () => void;
  sending: boolean;
}) {
  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold">{note.subject}</p>
              <Badge tone={statusTone[note.status]}>{note.status}</Badge>
              <Badge tone="accent">{note.channel}</Badge>
              <Badge tone="neutral">
                {note.kind === "lease_renewal" ? "lease renewal" : "COI"}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-[var(--muted)]">
              To {note.toName} · {note.toAddress}
            </p>
          </div>
          {note.status === "pending" && (
            <Button size="sm" disabled={sending} onClick={onSend}>
              Send
            </Button>
          )}
        </div>
        <pre className="whitespace-pre-wrap rounded-xl bg-[var(--surface-muted)] px-3 py-2.5 text-xs text-[var(--muted)]">
          {note.body}
        </pre>
        <p className="text-[11px] text-[var(--muted)]">
          Created {note.createdAt}
          {note.sentAt ? ` · Sent ${note.sentAt}` : ""}
        </p>
      </CardBody>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <StaggerItem>
      <Card className="p-4" interactive={false}>
        <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
          {label}
        </p>
        <p className="mt-2 text-2xl font-semibold">{value}</p>
      </Card>
    </StaggerItem>
  );
}
