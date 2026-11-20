import type { NewFeature } from "./currentFeatures";

// Structural session input only: no dependencies on other modules' helpers/types.
export type NewFeaturesSession = {
    identity: string | null;
    ready: boolean;
    isMasterLike: boolean;
    isAreaResponsable: boolean;
    areaExecution?: string;
    batchRecordWorkflowEnabled?: boolean;
    canAccessSuperMasterDirectives?: boolean;
    moduloAccesos: readonly {
        modulo: string;
        tabs: readonly { tabId: string; nivel: number }[];
    }[];
};

export type FeatureProgress = { consulted: boolean; visited: boolean };
export type NewFeaturesProgress = Readonly<Record<string, FeatureProgress>>;
const emptyProgress: NewFeaturesProgress = {};

// Private notification policy; deliberately independent from other modules' helpers.
export const NEW_FEATURES_NOTIFICATION_DAYS_KEY = "NEW_FEATURES_NOTIFICATION_DAYS";
export const DEFAULT_NOTIFICATION_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export function parseNotificationDays(value: unknown): number {
    if (typeof value !== "number" && (typeof value !== "string" || !/^\d+$/.test(value.trim()))) return DEFAULT_NOTIFICATION_DAYS;
    const days = Number(value);
    return Number.isInteger(days) && days >= 0 && days <= 365 ? days : DEFAULT_NOTIFICATION_DAYS;
}

export function featureNotificationWindow(feature: NewFeature, days: number) {
    const startsAt = Date.parse(feature.publishedAt);
    return { startsAt, expiresAt: startsAt + days * DAY_MS };
}

export function isFeatureNotificationActive(feature: NewFeature, days: number, now: number): boolean {
    const { startsAt, expiresAt } = featureNotificationWindow(feature, days);
    return days > 0 && Number.isFinite(startsAt) && now >= startsAt && now < expiresAt;
}

export const featureKey = (feature: NewFeature): string => JSON.stringify([feature.id, feature.revision]);

export function normalizeFeaturePath(path: string): string {
    return path.split(/[?#]/, 1)[0].replace(/\/+$/, "").toLowerCase() || "/";
}

export function isFeatureModulePath(path: string, modulePath: string): boolean {
    const current = normalizeFeaturePath(path);
    const target = normalizeFeaturePath(modulePath);
    return current === target || (target !== "/" && current.startsWith(`${target}/`));
}

export function canShowFeature(feature: NewFeature, session: NewFeaturesSession): boolean {
    if (!session.ready || !session.identity) return false;
    const rule = feature.access;
    if (rule.kind === "home") return !session.isAreaResponsable;
    if (rule.kind === "area") return session.isAreaResponsable
        && (!rule.requiresOf || (session.areaExecution ?? "AMBOS") !== "SOLO_OP");
    if (rule.kind === "supermaster") return !session.isAreaResponsable && Boolean(session.canAccessSuperMasterDirectives);
    if (session.isAreaResponsable || (rule.masterOnly && !session.isMasterLike)) return false;
    if (rule.requiresBatchRecord && !session.batchRecordWorkflowEnabled) return false;
    const minLevel = rule.minLevel ?? 1;
    if (session.isMasterLike) return 999 >= minLevel
        && (rule.requiredTabs ?? []).every((tab) => 999 >= tab.minLevel);
    const tabs = session.moduloAccesos.find((grant) => grant.modulo === rule.module)?.tabs ?? [];
    const hasTab = (tabId: string, level: number, exact?: boolean) => {
        const acceptedTabs = rule.module === "PRODUCCION" && tabId === "MONITOREAR_AREAS_OPERATIVAS"
            ? ["MONITOREAR_AREAS_OPERATIVAS", "SEGUIMIENTO_AREAS_OPERATIVAS"]
            : [tabId];
        const permission = tabs.find((tab) => acceptedTabs.includes(tab.tabId))
            ?? (exact ? undefined : tabs.find((tab) => tab.tabId === "MAIN"));
        return (permission?.nivel ?? 0) >= level;
    };
    return (rule.tabId ? hasTab(rule.tabId, minLevel, rule.exactTab) : tabs.some((tab) => tab.nivel >= minLevel))
        && (rule.requiredTabs ?? []).every((tab) => hasTab(tab.tabId, tab.minLevel, tab.exactTab));
}

export function featureStorageKey(identity: string, scope: string): string {
    return `exotic:new-features:v1:${encodeURIComponent(scope)}:${encodeURIComponent(identity)}`;
}

// A small external store keeps route observations, UI and browser tabs in sync.
// Failed browser persistence leaves the current session fully usable in memory.
export function createNewFeaturesStore(storageKey: string | null, features: readonly NewFeature[]) {
    const keys = features.map(featureKey);
    const listeners = new Set<() => void>();

    const parse = (raw: string | null): NewFeaturesProgress => {
        try {
            const parsed: unknown = JSON.parse(raw ?? "{}");
            if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return emptyProgress;
            return Object.fromEntries(keys.flatMap((key) => {
                const entry: unknown = (parsed as Record<string, unknown>)[key];
                if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
                const value = entry as Record<string, unknown>;
                return [[key, { consulted: value.consulted === true, visited: value.visited === true }]];
            }));
        } catch {
            return emptyProgress;
        }
    };

    const read = (): NewFeaturesProgress => {
        if (!storageKey) return emptyProgress;
        try { return parse(window.localStorage.getItem(storageKey)); }
        catch { return emptyProgress; }
    };

    let snapshot = read();
    const merge = (other: NewFeaturesProgress): Record<string, FeatureProgress> =>
        Object.fromEntries(keys.filter((key) => snapshot[key] || other[key]).map((key) => [key, {
            consulted: Boolean(snapshot[key]?.consulted || other[key]?.consulted),
            visited: Boolean(snapshot[key]?.visited || other[key]?.visited),
        }]));

    const publish = (next: NewFeaturesProgress) => {
        if (JSON.stringify(next) === JSON.stringify(snapshot)) return false;
        snapshot = next;
        listeners.forEach((listener) => listener());
        return true;
    };

    const persist = () => {
        if (!storageKey) return;
        try {
            const serialized = JSON.stringify(snapshot);
            if (window.localStorage.getItem(storageKey) !== serialized) window.localStorage.setItem(storageKey, serialized);
        } catch {
            // Keep the in-memory snapshot when storage is blocked or full.
        }
    };

    return {
        getSnapshot: () => snapshot,
        subscribe: (listener: () => void) => {
            const onStorage = (event: StorageEvent) => {
                if (event.key === storageKey && event.newValue !== null) {
                    if (publish(merge(parse(event.newValue)))) persist();
                }
            };
            listeners.add(listener);
            window.addEventListener("storage", onStorage);
            // A second tab may have written between initial render and subscribe.
            publish(merge(read()));
            return () => {
                listeners.delete(listener);
                window.removeEventListener("storage", onStorage);
            };
        },
        mark: (entries: readonly NewFeature[], field: keyof FeatureProgress) => {
            const next = merge(read());
            for (const feature of entries) {
                const key = featureKey(feature);
                if (!keys.includes(key)) continue;
                const previous = next[key] ?? { consulted: false, visited: false };
                next[key] = { ...previous, [field]: true };
            }
            publish(next);
            // Also prune retired entries when the catalogue is empty.
            persist();
        },
    };
}
