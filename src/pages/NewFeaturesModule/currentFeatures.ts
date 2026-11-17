export type NewFeatureAccess =
    | { kind: "home" }
    | { kind: "area" }
    | { kind: "module"; module: string; tabId?: string; minLevel?: number; exactTab?: boolean; masterOnly?: boolean };

export type NewFeature = {
    id: string;
    revision: string;
    moduleLabel: string;
    modulePath: string;
    title: string;
    description: string;
    location: readonly string[];
    access: NewFeatureAccess;
    image?: { src: string; alt: string; caption?: string };
};

// Replace this catalogue for each delivery. Keep only the current announcements.
// Preserve an entry's revision until its user-facing content needs a new notice.
export const currentFeatures: readonly NewFeature[] = [
    {
        id: "novedades-personalizadas",
        revision: "1",
        moduleLabel: "Inicio",
        modulePath: "/",
        title: "Lo nuevo, al alcance de tu mano",
        description: "Las mejoras que te sirven, en un solo lugar. Descubre qué cambió y dónde encontrarlo, según tus accesos.",
        location: ["Inicio", "Novedades"],
        access: { kind: "home" },
    },
];
