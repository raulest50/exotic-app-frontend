export type NewFeatureAccess =
    | { kind: "home" }
    | { kind: "area" }
    | { kind: "supermaster" }
    | {
        kind: "module"; module: string; tabId?: string; minLevel?: number; exactTab?: boolean; masterOnly?: boolean;
        requiredTabs?: readonly { tabId: string; minLevel: number; exactTab?: boolean }[];
    };

export type NewFeature = {
    id: string;
    revision: string;
    publishedAt: string;
    moduleLabel: string;
    modulePath: string;
    title: string;
    description: string;
    location: readonly string[];
    access: NewFeatureAccess;
    image?: { src: string; alt: string; caption?: string };
};

// Reset after the presentation on 2026-11-19 (America/Bogota): intentionally empty.
// Add only NEW changes after that presentation; never restore already presented notices.
// Update ONLY on explicit user request, never automatically for a commit/deploy.
// Keep one active catalogue; preserve id/revision unless a new notice is requested.
export const currentFeatures: readonly NewFeature[] = [];
