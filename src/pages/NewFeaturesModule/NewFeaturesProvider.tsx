import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useMasterDirectives } from "../../context/MasterDirectivesContext";
import { currentFeatures, type NewFeature } from "./currentFeatures";
import {
    canShowFeature, createNewFeaturesStore, featureKey, featureStorageKey, isFeatureModulePath,
    featureNotificationWindow, isFeatureNotificationActive, parseNotificationDays, NEW_FEATURES_NOTIFICATION_DAYS_KEY,
    type NewFeaturesSession,
} from "./newFeaturesState";
import { NewFeaturesContext } from "./useNewFeatures";
import { NewFeaturesAreaButton, NewFeaturesDialog } from "./NewFeaturesModule";

type ProviderProps = {
    children: ReactNode;
    features?: readonly NewFeature[];
    session?: NewFeaturesSession;
    storageScope?: string;
    notificationDays?: number;
};

export function NewFeaturesProvider({ children, features = currentFeatures, session, storageScope = import.meta.env.BASE_URL, notificationDays }: ProviderProps) {
    const auth = useAuth();
    const { rawDirectives, directives, loading: directivesLoading } = useMasterDirectives();
    const days = parseNotificationDays(notificationDays ?? rawDirectives.find((directive) => directive.nombre === NEW_FEATURES_NOTIFICATION_DAYS_KEY)?.valor);
    const policyReady = notificationDays !== undefined || !directivesLoading;
    const masterAccessValue = directives.ENABLE_MASTER_SUPERMASTER_DIRECTIVES_ACCESS;
    const masterAccessEnabled = typeof masterAccessValue === "boolean" ? masterAccessValue : true;
    const isSuperMaster = auth.user?.trim().toLowerCase() === "super_master";
    const canAccessSuperMasterDirectives = isSuperMaster || (auth.isMasterLike && !directivesLoading && masterAccessEnabled);
    const location = useLocation();
    const currentSession: NewFeaturesSession = useMemo(() => session ?? {
        identity: auth.user ? `user:${auth.meProfile?.id ?? auth.user}` : null,
        ready: auth.accesosReady,
        isMasterLike: auth.isMasterLike,
        isAreaResponsable: auth.isAreaResponsable,
        areaExecution: auth.areaResponsable?.alcanceEjecucion,
        batchRecordWorkflowEnabled: !directivesLoading && directives.BATCH_RECORD_WORKFLOW_ENABLED === true,
        canAccessSuperMasterDirectives,
        moduloAccesos: auth.moduloAccesos,
    }, [session, auth.user, auth.meProfile?.id, auth.accesosReady, auth.isMasterLike, auth.isAreaResponsable, auth.areaResponsable?.alcanceEjecucion, auth.moduloAccesos, canAccessSuperMasterDirectives, directivesLoading, directives.BATCH_RECORD_WORKFLOW_ENABLED]);
    const visibleFeatures = useMemo(() => features.filter((feature) => canShowFeature(feature, currentSession)), [features, currentSession]);
    const [now, setNow] = useState(() => Date.now());
    const notificationFeatures = useMemo(() => policyReady
        ? visibleFeatures.filter((feature) => isFeatureNotificationActive(feature, days, now)) : [],
    [visibleFeatures, days, now, policyReady]);

    useEffect(() => {
        // Wake at the next publication/expiry, and recheck after browser suspension.
        const currentTime = Date.now();
        const deadlines = visibleFeatures.flatMap((feature) => {
            const { startsAt, expiresAt } = featureNotificationWindow(feature, days);
            return [startsAt, expiresAt].filter((time) => time > now);
        });
        const delay = Math.max(1, Math.min(60_000, ...deadlines.map((time) => time - currentTime)));
        const refreshClock = () => setNow(Date.now());
        const timer = window.setTimeout(refreshClock, delay);
        window.addEventListener("focus", refreshClock);
        document.addEventListener("visibilitychange", refreshClock);
        return () => {
            window.clearTimeout(timer);
            window.removeEventListener("focus", refreshClock);
            document.removeEventListener("visibilitychange", refreshClock);
        };
    }, [visibleFeatures, days, now]);
    const storageKey = currentSession.ready && currentSession.identity ? featureStorageKey(currentSession.identity, storageScope) : null;
    const store = useMemo(() => createNewFeaturesStore(storageKey, features), [storageKey, features]);
    const progress = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
    const sessionScope = JSON.stringify([storageScope, currentSession]);
    // Reset only this feature's presentation, never remount the business pages.
    const [selection, setSelection] = useState<{ scope: string; key: string } | null>(null);

    useEffect(() => {
        setSelection((previous) => previous && (
            previous.scope !== sessionScope
            || !visibleFeatures.some((feature) => featureKey(feature) === previous.key)
        ) ? null : previous);
    }, [sessionScope, visibleFeatures]);

    useEffect(() => {
        store.mark(visibleFeatures.filter((feature) => isFeatureModulePath(location.pathname, feature.modulePath)), "visited");
    }, [location.pathname, visibleFeatures, store]);

    const selectFeature = useCallback((feature: NewFeature) => {
        if (!visibleFeatures.includes(feature)) return;
        setSelection({ scope: sessionScope, key: featureKey(feature) });
        store.mark([feature], "consulted");
    }, [visibleFeatures, store, sessionScope]);

    const openDialog = useCallback((modulePath?: string) => {
        const matching = modulePath
            ? visibleFeatures.filter((feature) => isFeatureModulePath(modulePath, feature.modulePath))
            : visibleFeatures;
        const first = matching.find((feature) => notificationFeatures.includes(feature) && !progress[featureKey(feature)]?.consulted)
            ?? matching.find((feature) => !progress[featureKey(feature)]?.consulted) ?? matching[0];
        if (!first) return;
        selectFeature(first);
    }, [visibleFeatures, notificationFeatures, progress, selectFeature]);

    const closeDialog = useCallback(() => setSelection(null), []);
    const selectedFeature = selection?.scope === sessionScope
        ? visibleFeatures.find((feature) => featureKey(feature) === selection.key)
        : undefined;
    const dialogOpen = selectedFeature !== undefined;
    const unreadCount = notificationFeatures.filter((feature) => !progress[featureKey(feature)]?.consulted).length;

    return (
        <NewFeaturesContext.Provider value={{ features: visibleFeatures, notificationFeatures, progress, unreadCount, dialogOpen, selectedFeature, openDialog, closeDialog, selectFeature }}>
            {children}
            {currentSession.isAreaResponsable && isFeatureModulePath(location.pathname, "/area-operativa") && <NewFeaturesAreaButton />}
            <NewFeaturesDialog />
        </NewFeaturesContext.Provider>
    );
}
