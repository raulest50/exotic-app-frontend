import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { Box, Button, Field, Heading, IconButton, Input, Text } from "@chakra-ui/react";
import { LuArrowUp, LuChevronRight, LuEyeOff, LuMessageCircle, LuMinus, LuSparkles } from "react-icons/lu";
import { ExoticMascot } from "./ExoticMascot";
import styles from "./AgentAssistant.module.css";
import "./assistantMotion.css";

export interface AgentAssistantProps {
    initialState?: "open" | "collapsed" | "hidden";
    canWrite?: boolean;
}

const suggestions = [
    "¿Qué productos necesitan reposición?",
    "¿Cómo va la producción de esta semana?",
    "¿Qué órdenes están pendientes?",
];

/**
 * Visual conversation only: drafts never leave this instance. The application
 * mounts it through AuthorizedAgentAssistant; canWrite describes the verified
 * access profile and does not execute or authorize a database operation.
 */
export function AgentAssistant({ initialState = "collapsed", canWrite = false }: AgentAssistantProps) {
    const [view, setView] = useState(initialState);
    const [draft, setDraft] = useState("");
    const [question, setQuestion] = useState<string | null>(null);
    const [motionPaused, setMotionPaused] = useState(() => typeof document !== "undefined" && document.hidden);
    const launcherRef = useRef<HTMLButtonElement>(null);
    const restoreRef = useRef<HTMLButtonElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const pendingFocus = useRef<"launcher" | "restore" | "input" | null>(null);
    const id = useId();
    const panelId = `${id}-panel`;
    const titleId = `${id}-title`;
    const inputId = `${id}-question`;
    const hintId = `${id}-hint`;

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

    const minimize = () => {
        pendingFocus.current = "launcher";
        setView("collapsed");
    };

    const open = () => {
        pendingFocus.current = "input";
        setView("open");
    };

    const hide = () => {
        pendingFocus.current = "restore";
        setView("hidden");
    };

    const restore = () => {
        pendingFocus.current = "launcher";
        setView("collapsed");
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "Escape" && view === "open") {
            event.stopPropagation();
            minimize();
        }
    };

    const showQuestion = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!draft.trim()) return;
        setQuestion(draft.trim());
        setDraft("");
        inputRef.current?.focus();
    };

    return (
        <Box
            className={styles.assistantAnchor}
            data-agent-assistant=""
            data-state={view}
            data-motion-paused={motionPaused ? "true" : "false"}
            onKeyDown={handleKeyDown}
        >
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
                                    </Box>
                                </Box>
                                <IconButton aria-label="Minimizar asistente" onClick={minimize} className={styles.iconButton} variant="plain">
                                    <LuMinus aria-hidden="true" />
                                </IconButton>
                            </Box>

                            <Box className={styles.conversation}>
                                <Box className={styles.welcome}>
                                    <Text className={styles.eyebrow} data-assistant-permission={canWrite ? "write" : "read"}>
                                        {canWrite ? "Lectura y escritura" : "Sólo lectura"}
                                    </Text>
                                    <Heading as="h3" className={styles.welcomeTitle}>Hola, ¿qué exploramos hoy?</Heading>
                                    <Text className={styles.welcomeCopy}>Tu información, un poco más cerca. Empieza con una pregunta.</Text>
                                    {!question && (
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
                                {question && (
                                    <Box role="status" aria-live="polite" aria-atomic="true">
                                        <Text className={`${styles.message} ${styles.userMessage}`}><span className={styles.screenReaderOnly}>Tu pregunta: </span>{question}</Text>
                                        <Text className={`${styles.message} ${styles.assistantMessage}`}>Así se verá tu pregunta. Las consultas todavía no están conectadas.</Text>
                                    </Box>
                                )}
                            </Box>

                            <form className={styles.composer} onSubmit={showQuestion}>
                                <Field.Root>
                                    <Field.Label htmlFor={inputId} className={styles.screenReaderOnly}>Escribe tu pregunta</Field.Label>
                                    <Box className={styles.composerField} w="full">
                                        <Input
                                            ref={inputRef}
                                            id={inputId}
                                            value={draft}
                                            onChange={(event) => setDraft(event.target.value)}
                                            placeholder="Escribe tu pregunta…"
                                            aria-describedby={hintId}
                                            autoComplete="off"
                                            variant="flushed"
                                        />
                                        <IconButton type="submit" aria-label="Previsualizar pregunta" disabled={!draft.trim()} className={styles.sendButton}>
                                            <LuArrowUp aria-hidden="true" />
                                        </IconButton>
                                    </Box>
                                </Field.Root>
                            </form>
                            <Text id={hintId} className={styles.composerFootnote}>Vista previa visual. Tus preguntas no se envían.</Text>
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
                            onClick={() => view === "open" ? minimize() : open()}
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
