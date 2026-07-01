"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef } from "react";
import { useShallow } from "zustand/react/shallow";

import {
  extractLegacyPersistedWorkspaceData,
  hasCustomWorkspaceData,
  type BandosWorkspaceDataRecord
} from "@/lib/workspace-data";
import {
  getWorkspaceDataSnapshot,
  useBandosUIStore
} from "@/store/ui-store";

type WorkspaceUIProviderProps = {
  workspaceId: string;
  initialRecord: BandosWorkspaceDataRecord;
  allowLegacyMigration?: boolean;
  children: ReactNode;
};

export function WorkspaceUIProvider({
  workspaceId,
  initialRecord,
  allowLegacyMigration = false,
  children
}: WorkspaceUIProviderProps) {
  const initializeWorkspaceData = useBandosUIStore(
    (state) => state.initializeWorkspaceData
  );
  const hydrateWorkspaceData = useBandosUIStore(
    (state) => state.hydrateWorkspaceData
  );
  const workspaceSnapshot = useBandosUIStore(
    useShallow((state) => getWorkspaceDataSnapshot(state))
  );
  const initializedWorkspaceId = useBandosUIStore(
    (state) => state.initializedWorkspaceId
  );
  const isInitializing = initializedWorkspaceId !== workspaceId;
  const snapshotKey = useMemo(
    () => JSON.stringify(workspaceSnapshot),
    [workspaceSnapshot]
  );
  const lastSyncedSnapshotRef = useRef("");
  const lastServerUpdatedAtRef = useRef(initialRecord.updatedAt);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const migratedLegacyStateRef = useRef(false);

  useEffect(() => {
    if (!isInitializing) {
      return;
    }

    initializeWorkspaceData({
      workspaceId,
      snapshot: initialRecord.snapshot
    });
    lastSyncedSnapshotRef.current = JSON.stringify(initialRecord.snapshot);
    lastServerUpdatedAtRef.current = initialRecord.updatedAt;
  }, [
    initializeWorkspaceData,
    initialRecord.snapshot,
    initialRecord.updatedAt,
    isInitializing,
    workspaceId
  ]);

  useEffect(() => {
    if (isInitializing) {
      return;
    }

    if (!allowLegacyMigration || !initialRecord.seeded || migratedLegacyStateRef.current) {
      return;
    }

    const legacySnapshot = extractLegacyPersistedWorkspaceData(
      window.localStorage.getItem("bandos-ui")
    );

    if (!legacySnapshot || !hasCustomWorkspaceData(legacySnapshot)) {
      return;
    }

    migratedLegacyStateRef.current = true;
    hydrateWorkspaceData(legacySnapshot);
  }, [allowLegacyMigration, hydrateWorkspaceData, initialRecord.seeded, isInitializing]);

  useEffect(() => {
    if (isInitializing) {
      return;
    }

    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
    }

    if (snapshotKey === lastSyncedSnapshotRef.current) {
      return;
    }

    syncTimerRef.current = setTimeout(async () => {
      const response = await fetch("/api/workspace-ui", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          snapshot: useBandosUIStore.getState().getWorkspaceSnapshot(),
          baseUpdatedAt: lastServerUpdatedAtRef.current
        })
      });

      if (response.status === 409) {
        const refreshResponse = await fetch("/api/workspace-ui", {
          method: "GET",
          cache: "no-store"
        });

        if (!refreshResponse.ok) {
          return;
        }

        const refreshedPayload = (await refreshResponse.json()) as BandosWorkspaceDataRecord;
        hydrateWorkspaceData(refreshedPayload.snapshot);
        lastSyncedSnapshotRef.current = JSON.stringify(refreshedPayload.snapshot);
        lastServerUpdatedAtRef.current = refreshedPayload.updatedAt;
        return;
      }

      if (response.ok) {
        const payload = (await response.json()) as BandosWorkspaceDataRecord;
        lastSyncedSnapshotRef.current = JSON.stringify(
          payload.snapshot
        );
        lastServerUpdatedAtRef.current = payload.updatedAt;
        window.localStorage.removeItem("bandos-ui");
      }
    }, 400);

    return () => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }
    };
  }, [hydrateWorkspaceData, isInitializing, snapshotKey]);

  useEffect(() => {
    if (isInitializing) {
      return;
    }

    async function refreshFromServer() {
      if (snapshotKey !== lastSyncedSnapshotRef.current) {
        return;
      }

      const response = await fetch("/api/workspace-ui", {
        method: "GET",
        cache: "no-store"
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as BandosWorkspaceDataRecord;
      const remoteSnapshotKey = JSON.stringify(payload.snapshot);

      if (remoteSnapshotKey === snapshotKey) {
        lastSyncedSnapshotRef.current = remoteSnapshotKey;
        lastServerUpdatedAtRef.current = payload.updatedAt;
        return;
      }

      hydrateWorkspaceData(payload.snapshot);
      lastSyncedSnapshotRef.current = remoteSnapshotKey;
      lastServerUpdatedAtRef.current = payload.updatedAt;
    }

    function handleFocus() {
      if (!document.hidden) {
        void refreshFromServer();
      }
    }

    function handlePageHide() {
      const latestSnapshot = useBandosUIStore.getState().getWorkspaceSnapshot();
      const latestSnapshotKey = JSON.stringify(latestSnapshot);

      if (latestSnapshotKey === lastSyncedSnapshotRef.current) {
        return;
      }

      void fetch("/api/workspace-ui", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          snapshot: latestSnapshot,
          baseUpdatedAt: lastServerUpdatedAtRef.current
        }),
        keepalive: true
      });
    }

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [hydrateWorkspaceData, isInitializing, snapshotKey]);

  return isInitializing ? null : <>{children}</>;
}
