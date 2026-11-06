import { AgentAssistantPreview } from "./AgentAssistantPreview";

export const Presentacion = () => <AgentAssistantPreview />;
export const Minimizado = () => <AgentAssistantPreview initialState="collapsed" />;
export const Oculto = () => <AgentAssistantPreview initialState="hidden" />;
export const LecturaYEscritura = () => <AgentAssistantPreview canWrite />;
