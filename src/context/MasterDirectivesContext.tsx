import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import axios from "axios";
import EndPointsURL from "../api/EndPointsURL";

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

interface MasterDirectivesContextValue extends MasterDirectivesMap {
    directives: MasterDirectivesMap;
    rawDirectives: MasterDirective[];
    loading: boolean;
    refreshDirectives: () => Promise<void>;
    getNumberDirective: (nombre: string, fallback: number) => number;
}

const defaultContext: MasterDirectivesContextValue = {
    directives: {},
    rawDirectives: [],
    loading: true,
    refreshDirectives: async () => {},
    getNumberDirective: (_nombre: string, fallback: number) => fallback,
};

const MasterDirectivesContext = createContext<MasterDirectivesContextValue>(defaultContext);

function parseDirectiveValue(md: MasterDirective): unknown {
    switch (md.tipoDato) {
        case "BOOLEANO":
            return md.valor === "true";
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
    const endPoints = useMemo(() => new EndPointsURL(), []);

    const refreshDirectives = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get<DTOAllMasterDirectives>(endPoints.get_master_directives);
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
            setLoading(false);
        }
    }, [endPoints]);

    useEffect(() => {
        refreshDirectives();
    }, [refreshDirectives]);

    const getNumberDirective = useCallback((nombre: string, fallback: number) => {
        const value = directives[nombre];
        if (typeof value === "number" && Number.isInteger(value) && value >= 1) {
            return value;
        }

        if (typeof value === "string") {
            const parsed = Number(value);
            if (Number.isInteger(parsed) && parsed >= 1) {
                return parsed;
            }
        }

        return fallback;
    }, [directives]);

    const contextValue = useMemo<MasterDirectivesContextValue>(() => ({
        ...directives,
        directives,
        rawDirectives,
        loading,
        refreshDirectives,
        getNumberDirective,
    }), [directives, rawDirectives, loading, refreshDirectives, getNumberDirective]);

    return (
        <MasterDirectivesContext.Provider value={contextValue}>
            {children}
        </MasterDirectivesContext.Provider>
    );
}

export function useMasterDirectives() {
    return useContext(MasterDirectivesContext);
}
