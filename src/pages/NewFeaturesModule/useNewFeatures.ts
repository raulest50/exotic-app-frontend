import { createContext, useContext } from "react";
import type { NewFeature } from "./currentFeatures";
import type { NewFeaturesProgress } from "./newFeaturesState";

type NewFeaturesContextValue = {
    features: readonly NewFeature[];
    notificationFeatures: readonly NewFeature[];
    progress: NewFeaturesProgress;
    unreadCount: number;
    dialogOpen: boolean;
    selectedFeature: NewFeature | undefined;
    openDialog: (modulePath?: string) => void;
    closeDialog: () => void;
    selectFeature: (feature: NewFeature) => void;
};

export const NewFeaturesContext = createContext<NewFeaturesContextValue | null>(null);

export function useNewFeatures(): NewFeaturesContextValue {
    const context = useContext(NewFeaturesContext);
    if (!context) throw new Error("NewFeatures components require NewFeaturesProvider.");
    return context;
}
