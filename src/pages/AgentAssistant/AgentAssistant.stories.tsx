import { AgentAssistantPreview } from "./AgentAssistantPreview";

export const Presentacion = () => <AgentAssistantPreview previewRemainingPercent={72.35} />;
export const Minimizado = () => <AgentAssistantPreview initialState="collapsed" />;
export const Oculto = () => <AgentAssistantPreview initialState="hidden" />;
export const LecturaYEscritura = () => <AgentAssistantPreview canWrite />;
export const CupoBajo = () => <AgentAssistantPreview previewRemainingPercent={12.5} />;
export const CupoAgotado = () => <AgentAssistantPreview previewRemainingPercent={0} />;
