import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent, PointerEvent } from "react";
import { Box, Button, Field, Heading, IconButton, Input, Progress, Text } from "@chakra-ui/react";
import { LuArrowUp, LuChevronRight, LuEyeOff, LuMaximize2, LuMessageCircle, LuMinimize2, LuMinus, LuSparkles } from "react-icons/lu";
import { ExoticMascot } from "./ExoticMascot";
import {
    ASSISTANT_MESSAGE_LIMIT,
    ASSISTANT_HISTORY_CHARACTER_LIMIT,
    ASSISTANT_HISTORY_MESSAGE_LIMIT,
    assistantAccessDenied,
    assistantErrorMessage,
    chatWithAssistant,
    executeAssistantProposal,
    getAssistantOperation,
    getAssistantStatus,
    pollAssistantOperation,
    type AssistantHistoryMessage,
    type AssistantOperation,
    type AssistantProposal,
    type AssistantStatus,
} from "./agentAssistantApi";
import styles from "./AgentAssistant.module.css";
import "./assistantMotion.css";

export interface AgentAssistantProps {
    initialState?: "open" | "collapsed" | "hidden";
    initialExpanded?: boolean;
    canWrite?: boolean;
    /** Keeps the visual stories isolated from authenticated services. */
    preview?: boolean;
    /** Visual-only allowance for isolated stories; never used by the connected assistant. */
    previewRemainingPercent?: number;
}

type AssistantCorner = `${"top" | "bottom"}-${"left" | "right"}`;
type AssistantDrag = {
    pointerId: number;
    startX: number;
    startY: number;
    bounds: DOMRect;
    moved: boolean;
};

const cornerLabels: Record<AssistantCorner, string> = {
    "top-left": "superior izquierda",
    "top-right": "superior derecha",
    "bottom-left": "inferior izquierda",
    "bottom-right": "inferior derecha",
};

const suggestions = [
    "¿Qué productos y materiales puedo consultar?",
    "Ayúdame a buscar un producto por nombre.",
    "¿Qué materiales pertenecen a una categoría?",
];

/**
 * Chat text goes through the backend. Read operations require confirmation;
 * SQL is handled by the server and results are never included in model history.
 * The backend authorizes every operation. This phase only supports reading.
 */
export function AgentAssistant({ initialState = "collapsed", initialExpanded = false, canWrite = false, preview = false, previewRemainingPercent }: AgentAssistantProps) {
    const [view, setView] = useState(initialState);
    const [expanded, setExpanded] = useState(initialExpanded && initialState === "open");
    const [draft, setDraft] = useState("");
    const [messages, setMessages] = useState<AssistantHistoryMessage[]>([]);
    const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
    const [status, setStatus] = useState<AssistantStatus | null>(null);
    const [statusLoading, setStatusLoading] = useState(false);
    const [statusError, setStatusError] = useState<string | null>(null);
    const [proposal, setProposal] = useState<AssistantProposal | null>(null);
    const [operation, setOperation] = useState<AssistantOperation | null>(null);
    const [busy, setBusy] = useState<"chat" | "execute" | "poll" | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [accessRevoked, setAccessRevoked] = useState(false);
    const [corner, setCorner] = useState<AssistantCorner>("bottom-right");
    const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
    const [motionPaused, setMotionPaused] = useState(() => typeof document !== "undefined" && document.hidden);
    const anchorRef = useRef<HTMLDivElement>(null);
    const conversationRef = useRef<HTMLDivElement>(null);
    const launcherRef = useRef<HTMLButtonElement>(null);
    const restoreRef = useRef<HTMLButtonElement>(null);
    const expandRef = useRef<HTMLButtonElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const pendingFocus = useRef<"launcher" | "restore" | "input" | null>(null);
    const dragRef = useRef<AssistantDrag | null>(null);
    const suppressClick = useRef(false);
    const requests = useRef(new Set<AbortController>());
    const statusRequest = useRef<AbortController | null>(null);
    const actionRequest = useRef<AbortController | null>(null);
    const previousStatus = useRef<AssistantStatus | null>(null);
    const revoked = useRef(false);
    const id = useId();
    const panelId = `${id}-panel`;
    const titleId = `${id}-title`;
    const inputId = `${id}-question`;
    const hintId = `${id}-hint`;
    const moveHelpId = `${id}-move-help`;
    const availabilityId = `${id}-availability`;
    const hasConversation = !!pendingQuestion || messages.length > 0 || !!proposal || !!operation;

    const clearConversation = useCallback(() => {
        setMessages([]);
        setProposal(null);
        setOperation(null);
        setPendingQuestion(null);
    }, []);

    const handleAccessFailure = useCallback((failure: unknown) => {
        if (!assistantAccessDenied(failure)) return false;
        revoked.current = true;
        requests.current.forEach((request) => request.abort());
        actionRequest.current = null;
        previousStatus.current = null;
        setStatus(null);
        setBusy(null);
        setStatusLoading(false);
        setAccessRevoked(true);
        clearConversation();
        setNotice(null);
        setError("La sesión caducó o se retiró tu acceso. Se limpiaron la conversación y los resultados. El borrador se conserva mientras este panel siga abierto; no se reenvía automáticamente.");
        return true;
    }, [clearConversation]);

    const refreshStatus = useCallback(async () => {
        if (preview || revoked.current) return;
        statusRequest.current?.abort();
        const request = new AbortController();
        statusRequest.current = request;
        requests.current.add(request);
        setStatusLoading(true);
        try {
            const next = await getAssistantStatus(request.signal);
            if (request.signal.aborted) return;
            const previous = previousStatus.current;
            if (previous && previous.connectionId !== next.connectionId) {
                actionRequest.current?.abort();
                actionRequest.current = null;
                setBusy(null);
                clearConversation();
                setNotice("La conexión del servicio cambió. Se limpiaron las propuestas y los resultados anteriores; tu borrador se conserva.");
            }
            previousStatus.current = next;
            setStatus(next);
            setStatusError(null);
        } catch (failure) {
            if (request.signal.aborted || handleAccessFailure(failure)) return;
            setStatus(null);
            setStatusError("No se pudo verificar el servicio del asistente. Pulsa Reintentar antes de enviar una pregunta.");
        } finally {
            requests.current.delete(request);
            if (!request.signal.aborted) setStatusLoading(false);
        }
    }, [clearConversation, handleAccessFailure, preview]);

    useEffect(() => {
        const activeRequests = requests.current;
        return () => activeRequests.forEach((request) => request.abort());
    }, []);

    useEffect(() => {
        if (view !== "open" || preview || accessRevoked) return;
        const refreshWhenVisible = () => {
            if (!document.hidden) void refreshStatus();
        };
        refreshWhenVisible();
        window.addEventListener("focus", refreshWhenVisible);
        document.addEventListener("visibilitychange", refreshWhenVisible);
        return () => {
            statusRequest.current?.abort();
            window.removeEventListener("focus", refreshWhenVisible);
            document.removeEventListener("visibilitychange", refreshWhenVisible);
        };
    }, [view, preview, accessRevoked, refreshStatus]);

    useEffect(() => {
        const updateVisibility = () => setMotionPaused(document.hidden);
        document.addEventListener("visibilitychange", updateVisibility);
        return () => document.removeEventListener("visibilitychange", updateVisibility);
    }, []);

    useEffect(() => {
        const target = pendingFocus.current === "input" ? inputRef : pendingFocus.current === "launcher" ? launcherRef : restoreRef;
        if (pendingFocus.current) target.current?.focus();
        pendingFocus.current = null;
    }, [view]);

    useEffect(() => {
        if (view !== "open" || (!hasConversation && !error)) return;
        const conversation = conversationRef.current;
        if (conversation) conversation.scrollTop = conversation.scrollHeight;
        // Polling the same operation state must leave the reader's position alone.
    }, [view, hasConversation, pendingQuestion, messages, proposal?.id, operation?.id, operation?.state, error]);

    const minimize = () => {
        setExpanded(false);
        pendingFocus.current = "launcher";
        setView("collapsed");
    };

    const open = () => {
        pendingFocus.current = "input";
        setView("open");
    };

    const hide = () => {
        setExpanded(false);
        pendingFocus.current = "restore";
        setView("hidden");
    };

    const restore = () => {
        pendingFocus.current = "launcher";
        setView("collapsed");
    };

    const startDrag = (event: PointerEvent<HTMLButtonElement>) => {
        if (!event.isPrimary || event.button !== 0 || !anchorRef.current) return;
        suppressClick.current = false;
        dragRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            bounds: anchorRef.current.getBoundingClientRect(),
            moved: false,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
    };

    const moveDrag = (event: PointerEvent<HTMLButtonElement>) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        const x = event.clientX - drag.startX;
        const y = event.clientY - drag.startY;
        // Small pointer movements remain an ordinary click/tap.
        if (!drag.moved && Math.hypot(x, y) < 6) return;
        drag.moved = true;
        const { bounds } = drag;
        setDragOffset({
            x: Math.max(8 - bounds.left, Math.min(x, window.innerWidth - bounds.right - 8)),
            y: Math.max(8 - bounds.top, Math.min(y, window.innerHeight - bounds.bottom - 8)),
        });
    };

    const finishDrag = (event: PointerEvent<HTMLButtonElement>) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        dragRef.current = null;
        suppressClick.current = drag.moved;
        if (drag.moved) {
            const vertical = event.clientY < window.innerHeight / 2 ? "top" : "bottom";
            const horizontal = event.clientX < window.innerWidth / 2 ? "left" : "right";
            setCorner(`${vertical}-${horizontal}`);
        }
        setDragOffset(null);
    };

    const cancelDrag = (event?: PointerEvent<HTMLButtonElement>) => {
        if (!dragRef.current || (event && event.pointerId !== dragRef.current.pointerId)) return;
        const { pointerId, moved } = dragRef.current;
        dragRef.current = null;
        suppressClick.current = moved;
        setDragOffset(null);
        if (launcherRef.current?.hasPointerCapture(pointerId)) {
            launcherRef.current.releasePointerCapture(pointerId);
        }
    };

    const moveWithKeyboard = (event: KeyboardEvent<HTMLButtonElement>) => {
        if (!event.altKey || !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
        event.preventDefault();
        event.stopPropagation();
        cancelDrag();
        setCorner((current) => {
            let vertical: "top" | "bottom" = current.startsWith("top") ? "top" : "bottom";
            let horizontal: "left" | "right" = current.endsWith("left") ? "left" : "right";
            if (event.key === "ArrowUp") vertical = "top";
            if (event.key === "ArrowDown") vertical = "bottom";
            if (event.key === "ArrowLeft") horizontal = "left";
            if (event.key === "ArrowRight") horizontal = "right";
            return `${vertical}-${horizontal}`;
        });
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "Escape" && dragRef.current) {
            event.preventDefault();
            event.stopPropagation();
            cancelDrag();
            return;
        }
        if (event.key === "Escape" && view === "open") {
            event.preventDefault();
            event.stopPropagation();
            if (expanded) {
                setExpanded(false);
                expandRef.current?.focus();
                return;
            }
            minimize();
        }
    };

    const beginAction = (kind: NonNullable<typeof busy>) => {
        if (preview || revoked.current || actionRequest.current) return null;
        const request = new AbortController();
        actionRequest.current = request;
        requests.current.add(request);
        setBusy(kind);
        setError(null);
        setNotice(null);
        return request;
    };

    const finishAction = (request: AbortController) => {
        requests.current.delete(request);
        if (actionRequest.current === request) {
            actionRequest.current = null;
            if (!request.signal.aborted) setBusy(null);
        }
    };

    const sendQuestion = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const question = draft.trim();
        if (!question || !status?.enabled || !status.available) return;
        if (question.length > ASSISTANT_MESSAGE_LIMIT) {
            setError(`La pregunta admite hasta ${ASSISTANT_MESSAGE_LIMIT} caracteres. El texto sigue en el campo.`);
            return;
        }
        const request = beginAction("chat");
        if (!request) return;
        setPendingQuestion(question);
        try {
            const reply = await chatWithAssistant(question, messages, request.signal);
            if (request.signal.aborted) return;
            setMessages((current) => [...current, { role: "user" as const, content: question }, { role: "assistant" as const, content: reply.message }].slice(-20));
            setProposal(reply.proposal ?? null);
            setOperation(null);
            setDraft((current) => current.trim() === question ? "" : current);
            inputRef.current?.focus();
        } catch (failure) {
            if (!request.signal.aborted && !handleAccessFailure(failure)) {
                setError(`${assistantErrorMessage(failure)} Tu pregunta sigue en el campo; no se reintenta automáticamente.`);
            }
        } finally {
            if (!request.signal.aborted) setPendingQuestion(null);
            finishAction(request);
            if (!request.signal.aborted) void refreshStatus();
        }
    };

    const followOperation = async (current: AssistantOperation, signal: AbortSignal) => {
        setOperation(current);
        await pollAssistantOperation(current, signal, (next) => setOperation(next));
    };

    const executeProposal = async () => {
        if (!proposal || operation || !status?.enabled) return;
        if (Date.parse(proposal.expiresAt) <= Date.now()) {
            setError("La consulta ha caducado. Envía de nuevo la pregunta para obtener otra; no se realizó la lectura.");
            return;
        }
        const request = beginAction("execute");
        if (!request) return;
        try {
            const created = await executeAssistantProposal(proposal.id, request.signal);
            if (!request.signal.aborted) await followOperation(created, request.signal);
        } catch (failure) {
            if (!request.signal.aborted && !handleAccessFailure(failure)) setError(assistantErrorMessage(failure));
        } finally {
            finishAction(request);
        }
    };

    const resumeOperation = async () => {
        if (!operation || operation.state !== "BACKING_UP" || !status?.enabled) return;
        const request = beginAction("poll");
        if (!request) return;
        try {
            const current = await getAssistantOperation(operation.id, request.signal);
            if (!request.signal.aborted) await followOperation(current, request.signal);
        } catch (failure) {
            if (!request.signal.aborted && !handleAccessFailure(failure)) setError(assistantErrorMessage(failure));
        } finally {
            finishAction(request);
        }
    };

    const canSend = !preview && !accessRevoked && !!status?.enabled && status.available && !busy && !statusLoading;
    const unavailableReason = preview ? "Vista previa sin conexión."
        : accessRevoked ? "No tienes acceso vigente al asistente."
        : statusLoading ? "Verificando disponibilidad del asistente…"
        : busy ? "Espera a que termine la operación en curso."
        : !status ? "No se pudo comprobar la disponibilidad. Pulsa Reintentar."
        : !status.enabled || !status.available ? status.message : "";
    const proposalExpired = !!proposal && Date.parse(proposal.expiresAt) <= Date.now();
    const remainingPercent = preview ? previewRemainingPercent ?? null : status?.usage?.remainingPercent ?? null;

    return (
        <Box
            ref={anchorRef}
            className={styles.assistantAnchor}
            data-agent-assistant=""
            data-state={view}
            data-expanded={expanded && view === "open" ? "true" : "false"}
            data-corner={corner}
            data-dragging={dragOffset ? "true" : "false"}
            data-motion-paused={motionPaused || dragOffset ? "true" : "false"}
            style={dragOffset ? { transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)` } : undefined}
            onKeyDown={handleKeyDown}
        >
            <span id={moveHelpId} className={styles.screenReaderOnly}>
                Arrastra el personaje a una esquina para mover el asistente. También puedes usar Alt y las flechas con el personaje enfocado.
            </span>
            <span className={styles.screenReaderOnly} role="status" aria-live="polite">
                Asistente en la esquina {cornerLabels[corner]}.
            </span>
            {view === "hidden" ? (
                <Button ref={restoreRef} className={styles.restoreButton} onClick={restore} variant="plain">
                    <LuMessageCircle aria-hidden="true" /> Mostrar asistente
                </Button>
            ) : (
                <Box className={styles.assistantCluster} data-state={view}>
                    {view === "open" && (
                        <Box as="aside" id={panelId} aria-labelledby={titleId} className={styles.panel}>
                            <Box className={styles.panelHeader}>
                                <Box className={styles.panelIdentity}>
                                    <Box className={styles.avatarBadge} aria-hidden="true"><LuSparkles /></Box>
                                    <Box>
                                        <Text className={styles.eyebrow}>Un poco de ayuda</Text>
                                        <Heading as="h2" id={titleId} className={styles.panelTitle}>Asistente Exotic</Heading>
                                        <Text className={styles.readOnlyBadge} data-assistant-permission="read">Sólo lectura · productos y materiales</Text>
                                    </Box>
                                </Box>
                                <Box display="flex" flexShrink="0" gap="1">
                                    <IconButton ref={expandRef}
                                        aria-label={expanded ? "Restaurar tamaño del chat" : "Ampliar chat"}
                                        title={expanded ? "Restaurar tamaño · Esc" : "Ampliar chat"}
                                        aria-pressed={expanded}
                                        aria-controls={panelId}
                                        onClick={() => { cancelDrag(); setExpanded((current) => !current); }}
                                        className={styles.iconButton} variant="plain">
                                        {expanded ? <LuMinimize2 aria-hidden="true" /> : <LuMaximize2 aria-hidden="true" />}
                                    </IconButton>
                                    <IconButton aria-label="Minimizar asistente" onClick={minimize} className={styles.iconButton} variant="plain">
                                        <LuMinus aria-hidden="true" />
                                    </IconButton>
                                </Box>
                            </Box>

                            <Box px="5" py="2" borderBottomWidth="1px" borderColor="border.subtle" bg="bg.subtle">
                                <Progress.Root value={remainingPercent} size="xs"
                                    colorPalette={remainingPercent !== null && remainingPercent <= 20 ? "orange" : "teal"}
                                    aria-label="Cupo estimado restante del asistente">
                                    <Box display="flex" justifyContent="space-between" gap="3" mb="1">
                                        <Progress.Label fontSize="xs">Cupo estimado restante</Progress.Label>
                                        <Text fontSize="xs" fontVariantNumeric="tabular-nums">
                                            {remainingPercent === null ? "No disponible" : `${remainingPercent.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`}
                                        </Text>
                                    </Box>
                                    {remainingPercent !== null && <Progress.Track><Progress.Range /></Progress.Track>}
                                </Progress.Root>
                            </Box>

                            <Box ref={conversationRef} className={styles.conversation} aria-busy={busy === "chat"}>
                                <Box className={styles.welcome}>
                                    <Heading as="h3" className={styles.welcomeTitle}>Consulta a Asistente Exotic</Heading>
                                    <Text className={styles.welcomeCopy}>Pregunta sobre productos y materiales. El asistente prepara la consulta y solicita tu confirmación antes de respaldar y leer la información.</Text>
                                    {canWrite && <Text className={styles.connectionCopy}>Tu perfil incluye escritura, pero esta fase sólo permite lectura. No se modifican datos desde el asistente.</Text>}
                                    <Box className={styles.connectionCard}>
                                        {preview ? (
                                            <Text className={styles.connectionCopy}>Vista previa aislada. La conexión y las consultas están desactivadas en este escenario.</Text>
                                        ) : (
                                            <>
                                                <Text className={styles.connectionTitle}>
                                                    {accessRevoked ? "Acceso no disponible" : statusLoading ? "Verificando servicio…" : status?.enabled && status.available ? "Asistente disponible" : "Servicio no disponible"}
                                                </Text>
                                                {status && <Text className={styles.connectionCopy}>{status.message}</Text>}
                                                <Box className={styles.connectionActions}>
                                                    <Button size="xs" variant="outline" onClick={() => void refreshStatus()} disabled={statusLoading || !!busy || accessRevoked}>Reintentar</Button>
                                                </Box>
                                                {statusError && <Text className={styles.errorText} role="alert">{statusError}</Text>}
                                            </>
                                        )}
                                    </Box>
                                    {!messages.length && !pendingQuestion && (
                                        <Box className={styles.suggestions}>
                                            {suggestions.map((suggestion) => (
                                                <Button
                                                    key={suggestion}
                                                    className={styles.suggestion}
                                                    variant="plain"
                                                    whiteSpace="normal"
                                                    onClick={() => { setDraft(suggestion); inputRef.current?.focus(); }}
                                                >
                                                    {suggestion}<LuChevronRight aria-hidden="true" />
                                                </Button>
                                            ))}
                                        </Box>
                                    )}
                                </Box>
                                <Box role="log" aria-label="Conversación con Asistente Exotic" aria-live="polite" aria-relevant="additions">
                                    {messages.map((message, index) => (
                                        <Text key={`${index}-${message.role}`} className={`${styles.message} ${message.role === "user" ? styles.userMessage : styles.assistantMessage}`}>
                                            <span className={styles.screenReaderOnly}>{message.role === "user" ? "Tu pregunta: " : "Asistente Exotic: "}</span>{message.content}
                                        </Text>
                                    ))}
                                    {pendingQuestion && <Text className={`${styles.message} ${styles.userMessage}`}>{pendingQuestion}</Text>}
                                </Box>
                                {busy === "chat" && <Text className={styles.actionNotice} role="status">Asistente Exotic está preparando la respuesta… Tu pregunta se conserva hasta recibirla.</Text>}
                                {proposal && (
                                    <Box className={styles.proposalCard} as="section" aria-label="Confirmar consulta de información">
                                        <Heading as="h3" fontSize="sm">Consulta preparada</Heading>
                                        <Text className={styles.connectionCopy}>Al confirmar se crea un respaldo previo y se consulta la información autorizada. No se modifican datos.</Text>
                                        <Text className={styles.connectionCopy}>Caduca: {new Date(proposal.expiresAt).toLocaleString("es-CO")}{proposalExpired ? " · Propuesta caducada" : ""}</Text>
                                        <Button size="sm" mt="3" onClick={() => void executeProposal()} disabled={!!busy || !!operation || proposalExpired || !status?.enabled || accessRevoked}>
                                            {busy === "execute" ? "Preparando lectura…" : "Consultar información"}
                                        </Button>
                                    </Box>
                                )}
                                {operation && (
                                    <Box className={styles.proposalCard} as="section" aria-label="Estado y resultado de la lectura">
                                        <Text className={styles.connectionTitle} role="status">{operation.state === "BACKING_UP" ? "Preparando respaldo y lectura" : operation.state === "COMPLETE" ? "Lectura finalizada" : "La lectura falló"}</Text>
                                        <Text className={styles.connectionCopy}>{operation.message}</Text>
                                        <Text className={styles.operationId}>Operación: {operation.id}</Text>
                                        {operation.backupId && <Text className={styles.operationId}>Respaldo: {operation.backupId}</Text>}
                                        {operation.state === "BACKING_UP" && !busy && <Button size="sm" mt="3" variant="outline" onClick={() => void resumeOperation()} disabled={!status?.enabled || accessRevoked}>Volver a consultar esta operación</Button>}
                                        {operation.state === "COMPLETE" && operation.result && (
                                            <>
                                                <div className={styles.resultScroll} tabIndex={0} role="region" aria-label="Tabla del resultado de la lectura">
                                                    <table className={styles.resultTable}>
                                                        <caption>Resultado: {operation.result.rows.length} filas recibidas</caption>
                                                        <thead><tr>{operation.result.columns.map((column, index) => <th key={index} scope="col">{column}</th>)}</tr></thead>
                                                        <tbody>{operation.result.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, columnIndex) => <td key={columnIndex}>{cell === null ? "NULL" : String(cell)}</td>)}</tr>)}</tbody>
                                                    </table>
                                                </div>
                                                {!operation.result.rows.length && <Text className={styles.connectionCopy}>La consulta no devolvió filas.</Text>}
                                                {operation.result.truncated && <Text className={styles.connectionCopy}>Resultado limitado por el servidor. Refina la consulta para reducir las filas.</Text>}
                                                <Text className={styles.connectionCopy}>Las filas se muestran aquí y no se añaden automáticamente a la conversación con el asistente.</Text>
                                            </>
                                        )}
                                    </Box>
                                )}
                                {notice && <Text className={styles.actionNotice} role="status">{notice}</Text>}
                                {error && <Text className={styles.errorNotice} role="alert">{error}</Text>}
                            </Box>

                            <form className={styles.composer} onSubmit={(event) => void sendQuestion(event)}>
                                <Field.Root>
                                    <Field.Label htmlFor={inputId} className={styles.screenReaderOnly}>Escribe tu pregunta</Field.Label>
                                    <Box className={styles.composerField} w="full">
                                        <Input
                                            ref={inputRef}
                                            id={inputId}
                                            value={draft}
                                            onChange={(event) => setDraft(event.target.value)}
                                            placeholder="Escribe tu pregunta…"
                                            aria-describedby={`${hintId} ${availabilityId}`}
                                            autoComplete="off"
                                            maxLength={ASSISTANT_MESSAGE_LIMIT}
                                            variant="flushed"
                                        />
                                        <IconButton type="submit" aria-label="Enviar pregunta a Asistente Exotic" aria-describedby={availabilityId} title={unavailableReason || "Enviar pregunta"} disabled={!draft.trim() || !canSend} className={styles.sendButton}>
                                            <LuArrowUp aria-hidden="true" />
                                        </IconButton>
                                    </Box>
                                </Field.Root>
                            </form>
                            <Text id={availabilityId} className={styles.composerFootnote} role="status">{unavailableReason}</Text>
                            <Text id={hintId} className={styles.composerFootnote}>{`Tu pregunta se envía al servicio de IA a través del servidor de Exotic. Hasta ${ASSISTANT_MESSAGE_LIMIT.toLocaleString("es-CO")} caracteres por pregunta. Historial limitado a ${ASSISTANT_HISTORY_MESSAGE_LIMIT} mensajes y ${ASSISTANT_HISTORY_CHARACTER_LIMIT.toLocaleString("es-CO")} caracteres; no incluye filas de resultados. Sólo lectura.`}</Text>
                        </Box>
                    )}

                    <Box className={styles.mascotDock}>
                        {view === "collapsed" && <Text className={styles.launcherHint}>Estoy por aquí<br />si me necesitas.</Text>}
                        <button
                            ref={launcherRef}
                            type="button"
                            className={styles.launcher}
                            data-mascot-interactive=""
                            aria-label={view === "open" ? "Minimizar asistente Exotic" : "Abrir asistente Exotic"}
                            aria-expanded={view === "open"}
                            aria-controls={view === "open" ? panelId : undefined}
                            aria-describedby={moveHelpId}
                            title="Arrastra a una esquina para mover · Alt + flechas"
                            onPointerDown={startDrag}
                            onPointerMove={moveDrag}
                            onPointerUp={finishDrag}
                            onPointerCancel={cancelDrag}
                            onLostPointerCapture={cancelDrag}
                            onKeyDown={moveWithKeyboard}
                            onClick={(event) => {
                                if (suppressClick.current && event.detail !== 0) {
                                    suppressClick.current = false;
                                    return;
                                }
                                if (view === "open") minimize();
                                else open();
                            }}
                        >
                            <ExoticMascot decorative />
                            <span className={styles.launcherLabel}>Exotic · asistente</span>
                        </button>
                        <Box className={styles.launcherControls}>
                            <IconButton aria-label="Ocultar asistente" onClick={hide} className={styles.iconButton} variant="plain">
                                <LuEyeOff aria-hidden="true" />
                            </IconButton>
                        </Box>
                    </Box>
                </Box>
            )}
        </Box>
    );
}
