import { useEffect, useState } from "react";
import axios from "axios";
import EndPointsURL from "../../api/EndPointsURL";
import { useAuth } from "../../context/AuthContext";
import { Modulo } from "../Usuarios/GestionUsuarios/types";
import { AgentAssistant } from "./AgentAssistant";

type AssistantAccess = {
    nivel: 0 | 1 | 2;
    canRead: boolean;
    canWrite: boolean;
};

const endPoints = new EndPointsURL();

function isAssistantAccess(value: unknown): value is AssistantAccess {
    if (!value || typeof value !== "object") return false;
    const access = value as Record<string, unknown>;
    return (access.nivel === 0 || access.nivel === 1 || access.nivel === 2)
        && access.canRead === (access.nivel >= 1)
        && access.canWrite === (access.nivel === 2);
}

function VerifiedAgentAssistant() {
    const [access, setAccess] = useState<AssistantAccess | null>(null);

    useEffect(() => {
        let disposed = false;
        let request: AbortController | undefined;

        const refresh = async () => {
            request?.abort();
            const currentRequest = new AbortController();
            request = currentRequest;
            try {
                const { data } = await axios.get<unknown>(endPoints.agent_assistant_access, {
                    signal: currentRequest.signal,
                    timeout: 10_000,
                });
                if (!disposed && !currentRequest.signal.aborted) {
                    setAccess(isAssistantAccess(data) ? data : null);
                }
            } catch {
                if (!disposed && !currentRequest.signal.aborted) setAccess(null);
            }
        };

        const refreshWhenVisible = () => {
            if (!document.hidden) void refresh();
        };

        void refresh();
        window.addEventListener("focus", refreshWhenVisible);
        document.addEventListener("visibilitychange", refreshWhenVisible);
        const interval = window.setInterval(refreshWhenVisible, 60_000);
        return () => {
            disposed = true;
            request?.abort();
            window.clearInterval(interval);
            window.removeEventListener("focus", refreshWhenVisible);
            document.removeEventListener("visibilitychange", refreshWhenVisible);
        };
    }, []);

    if (!access?.canRead) return null;
    // A changed profile clears the previous conversation and draft.
    return <AgentAssistant key={access.nivel} canWrite={access.canWrite} />;
}

/** Fail closed until the active session and the server's current grant are known. */
export function AuthorizedAgentAssistant() {
    const { user, accesosReady, moduloAccesos, isMasterLike } = useAuth();
    if (!user || !accesosReady) return null;

    // Self-edits in Usuarios refresh this snapshot. A different user/grant
    // remounts the boundary immediately; its state is never persisted locally.
    const identity = JSON.stringify([
        user,
        isMasterLike,
        moduloAccesos.filter((access) => access.modulo === Modulo.AGENT_ASSISTANT),
    ]);
    return <VerifiedAgentAssistant key={identity} />;
}
