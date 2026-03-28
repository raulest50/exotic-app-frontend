import { tabsForModule } from "../../../auth/moduleTabDefinitions.ts";
import { Modulo, type User } from "./types.tsx";

export type TabDraft = {
    enabled: boolean;
    nivel: number;
};

export type ModuleDraft = {
    enabled: boolean;
    tabs: Record<string, TabDraft>;
};

export type AccessDraft = Record<Modulo, ModuleDraft>;

type PayloadTab = {
    tabId: string;
    nivel: number;
};

type PayloadModulo = {
    modulo: Modulo;
    tabs: PayloadTab[];
};

export type UpdateUserAccesosPayload = {
    accesos: PayloadModulo[];
};

export function isModulo(value: string): value is Modulo {
    return Object.values(Modulo).includes(value as Modulo);
}

export function moduleLabel(modulo: Modulo): string {
    return modulo.replace(/_/g, " ");
}

export function buildAccessDraft(user: User): AccessDraft {
    const current = new Map<Modulo, NonNullable<User["moduloAccesos"]>[number]>();
    for (const ma of user.moduloAccesos ?? []) {
        const raw = typeof ma.modulo === "string" ? ma.modulo : String(ma.modulo);
        if (isModulo(raw)) {
            current.set(raw, ma);
        }
    }

    const draft = {} as AccessDraft;

    for (const modulo of Object.values(Modulo)) {
        const defs = tabsForModule(modulo);
        const moduloAcceso = current.get(modulo);
        const tabs = Object.fromEntries(
            defs.map((def) => {
                const existing = moduloAcceso?.tabs?.find((tab) => tab.tabId === def.tabId);
                return [
                    def.tabId,
                    {
                        enabled: Boolean(existing),
                        nivel: clampNivel(existing?.nivel ?? 1),
                    },
                ];
            })
        ) as Record<string, TabDraft>;

        draft[modulo] = {
            enabled: Object.values(tabs).some((tab) => tab.enabled),
            tabs,
        };
    }

    return draft;
}

export function buildExpandedState(draft: AccessDraft): Record<Modulo, boolean> {
    const expanded = {} as Record<Modulo, boolean>;
    for (const modulo of Object.values(Modulo)) {
        expanded[modulo] = draft[modulo].enabled;
    }
    return expanded;
}

export function serializeDraft(draft: AccessDraft): UpdateUserAccesosPayload {
    const accesos: PayloadModulo[] = [];

    for (const modulo of Object.values(Modulo)) {
        const defs = tabsForModule(modulo);
        const row = draft[modulo];
        const tabs = defs
            .map((def) => ({
                tabId: def.tabId,
                nivel: clampNivel(row.tabs[def.tabId]?.nivel ?? 1),
                enabled: Boolean(row.tabs[def.tabId]?.enabled),
            }))
            .filter((tab) => tab.enabled)
            .map(({ enabled: _enabled, ...tab }) => tab);

        if (tabs.length > 0) {
            accesos.push({ modulo, tabs });
        }
    }

    return { accesos };
}

export function draftSignature(draft: AccessDraft): string {
    return JSON.stringify(serializeDraft(draft));
}

export function clampNivel(nivel: number): number {
    if (!Number.isFinite(nivel)) return 1;
    return Math.min(4, Math.max(1, Math.floor(nivel)));
}
