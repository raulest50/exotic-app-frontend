import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { currentFeatures, type NewFeature } from "./currentFeatures";
import {
    canShowFeature, createNewFeaturesStore, featureKey, featureStorageKey, isFeatureModulePath,
    type NewFeaturesSession,
} from "./newFeaturesState";
import { NewFeaturesContext } from "./useNewFeatures";
import { NewFeaturesAreaButton, NewFeaturesDialog } from "./NewFeaturesModule";

type ProviderProps = {
    children: ReactNode;
    features?: readonly NewFeature[];
    session?: NewFeaturesSession;
    storageScope?: string;
};

export function NewFeaturesProvider({ children, features = currentFeatures, session, storageScope = import.meta.env.BASE_URL }: ProviderProps) {
    const auth = useAuth();
    const location = useLocation();
    const currentSession: NewFeaturesSession = useMemo(() => session ?? {
        identity: auth.user ? `user:${auth.meProfile?.id ?? auth.user}` : null,
        ready: auth.accesosReady,
        isMasterLike: auth.isMasterLike,
        isAreaResponsable: auth.isAreaResponsable,
        moduloAccesos: auth.moduloAccesos,
    }, [session, auth.user, auth.meProfile?.id, auth.accesosReady, auth.isMasterLike, auth.isAreaResponsable, auth.moduloAccesos]);
    const visibleFeatures = useMemo(() => features.filter((feature) => canShowFeature(feature, currentSession)), [features, currentSession]);
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
        const first = matching.find((feature) => !progress[featureKey(feature)]?.consulted) ?? matching[0];
        if (!first) return;
        selectFeature(first);
    }, [visibleFeatures, progress, selectFeature]);

    const closeDialog = useCallback(() => setSelection(null), []);
    const selectedFeature = selection?.scope === sessionScope
        ? visibleFeatures.find((feature) => featureKey(feature) === selection.key)
        : undefined;
    const dialogOpen = selectedFeature !== undefined;
    const unreadCount = visibleFeatures.filter((feature) => !progress[featureKey(feature)]?.consulted).length;

    return (
        <NewFeaturesContext.Provider value={{ features: visibleFeatures, progress, unreadCount, dialogOpen, selectedFeature, openDialog, closeDialog, selectFeature }}>
            {children}
            {currentSession.isAreaResponsable && isFeatureModulePath(location.pathname, "/area-operativa") && <NewFeaturesAreaButton />}
            <NewFeaturesDialog />
        </NewFeaturesContext.Provider>
    );
}
