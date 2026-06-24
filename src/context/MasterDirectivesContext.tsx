import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import axios from "axios";
import EndPointsURL from "../api/EndPointsURL";
import { useAuth } from "./AuthContext";

export interface MasterDirective {
    id: number;
    nombre: string;
    resumen: string;
    valor: string;
    tipoDato: "TEXTO" | "NUMERO" | "DECIMAL" | "BOOLEANO" | "FECHA" | "JSON";
    grupo?: string;
    ayuda?: string;
}

interface DTOAllMasterDirectives {
    masterDirectives: MasterDirective[];
}

type MasterDirectivesMap = Record<string, unknown>;
type NumberDirectiveOptions = {
    min?: number;
    max?: number;
};

interface MasterDirectivesContextValue extends MasterDirectivesMap {
    directives: MasterDirectivesMap;
    rawDirectives: MasterDirective[];
    loading: boolean;
    refreshDirectives: () => Promise<void>;
    getNumberDirective: (nombre: string, fallback: number, options?: NumberDirectiveOptions) => number;
    getBooleanDirective: (nombre: string, fallback: boolean) => boolean;
}

const defaultContext: MasterDirectivesContextValue = {
    directives: {},
    rawDirectives: [],
    loading: true,
    refreshDirectives: async () => {},
    getNumberDirective: (_nombre: string, fallback: number) => fallback,
    getBooleanDirective: (_nombre: string, fallback: boolean) => fallback,
};

const MasterDirectivesContext = createContext<MasterDirectivesContextValue>(defaultContext);

function parseDirectiveValue(md: MasterDirective): unknown {
    switch (md.tipoDato) {
        case "BOOLEANO":
            return md.valor.trim().toLowerCase() === "true";
        case "NUMERO": {
            const parsed = Number(md.valor);
            return Number.isInteger(parsed) ? parsed : md.valor;
        }
        case "DECIMAL": {
            const parsed = Number(md.valor);
            return Number.isFinite(parsed) ? parsed : md.valor;
        }
        case "JSON":
            try {
                return JSON.parse(md.valor);
            } catch {
                return md.valor;
            }
        default:
            return md.valor;
    }
}

export function MasterDirectivesProvider({ children }: { children: ReactNode }) {
    const [directives, setDirectives] = useState<MasterDirectivesMap>({});
    const [rawDirectives, setRawDirectives] = useState<MasterDirective[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [loadedForUser, setLoadedForUser] = useState<string | null>(null);
    const endPoints = useMemo(() => new EndPointsURL(), []);
    const { user, accesosReady } = useAuth();

    const refreshDirectives = useCallback(async () => {
        if (!user) {
            setRawDirectives([]);
            setDirectives({});
            setLoadedForUser(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const res = await axios.get<DTOAllMasterDirectives>(endPoints.get_super_master_directives);
            const list = res.data.masterDirectives ?? [];
            const map: MasterDirectivesMap = {};
            list.forEach(md => {
                map[md.nombre] = parseDirectiveValue(md);
            });
            setRawDirectives(list);
            setDirectives(map);
        } catch (error) {
            console.error("Error fetching master directives", error);
            setRawDirectives([]);
            setDirectives({});
        } finally {
            setLoadedForUser(user);
            setLoading(false);
        }
    }, [endPoints, user]);

    useEffect(() => {
        if (!accesosReady) {
            setLoading(true);
            return;
        }

        if (!user) {
            setRawDirectives([]);
            setDirectives({});
            setLoadedForUser(null);
            setLoading(false);
            return;
        }

        refreshDirectives();
    }, [accesosReady, user, refreshDirectives]);

    const effectiveLoading = loading || (Boolean(user) && loadedForUser !== user);

    const getNumberDirective = useCallback((nombre: string, fallback: number, options: NumberDirectiveOptions = {}) => {
        const min = options.min ?? 1;
        const max = options.max ?? Number.POSITIVE_INFINITY;
        const value = directives[nombre];
        if (typeof value === "number" && Number.isInteger(value) && value >= min && value <= max) {
            return value;
        }

        if (typeof value === "string") {
            const parsed = Number(value);
            if (Number.isInteger(parsed) && parsed >= min && parsed <= max) {
                return parsed;
            }
        }

        return fallback;
    }, [directives]);

    const getBooleanDirective = useCallback((nombre: string, fallback: boolean) => {
        const value = directives[nombre];
        if (typeof value === "boolean") {
            return value;
        }

        if (typeof value === "string") {
            const normalized = value.trim().toLowerCase();
            if (normalized === "true") return true;
            if (normalized === "false") return false;
        }

        return fallback;
    }, [directives]);

    const contextValue = useMemo<MasterDirectivesContextValue>(() => ({
        ...directives,
        directives,
        rawDirectives,
        loading: effectiveLoading,
        refreshDirectives,
        getNumberDirective,
        getBooleanDirective,
    }), [directives, rawDirectives, effectiveLoading, refreshDirectives, getNumberDirective, getBooleanDirective]);

    return (
        <MasterDirectivesContext.Provider value={contextValue}>
            {children}
        </MasterDirectivesContext.Provider>
    );
}

export function useMasterDirectives() {
    return useContext(MasterDirectivesContext);
}
