import { Badge, Box, Button, CloseButton, Dialog, Portal } from "@chakra-ui/react";
import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { LuArrowLeft, LuArrowRight, LuArrowUpRight, LuCheck, LuChevronRight, LuMapPin, LuSparkles } from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import { featureKey, normalizeFeaturePath } from "./newFeaturesState";
import { useNewFeatures } from "./useNewFeatures";
import { NewFeaturesIllustration } from "./NewFeaturesIllustration";
import styles from "./NewFeaturesModule.module.css";

export function NewFeaturesButton() {
    const { features, unreadCount, openDialog } = useNewFeatures();
    if (!features.length) return null;
    return (
        <Button colorPalette="purple" variant={unreadCount ? "solid" : "outline"} onClick={() => openDialog()} aria-label={unreadCount ? `Novedades: ${unreadCount} sin consultar` : "Consultar novedades"}>
            <LuSparkles aria-hidden="true" /> Novedades
            {unreadCount > 0 && <Badge colorPalette="purple" variant="subtle" rounded="full">{unreadCount}</Badge>}
        </Button>
    );
}

export function NewFeaturesAreaButton() {
    const { features } = useNewFeatures();
    if (!features.length) return null;
    return <Box position="fixed" bottom={4} left={4} zIndex="docked"><NewFeaturesButton /></Box>;
}

// This sibling of SectionCard's link keeps links and notification buttons intact.
export function NewFeaturesCard({ modulePath, children }: { modulePath: string; children: ReactNode }) {
    const { notificationFeatures, progress, openDialog } = useNewFeatures();
    const pending = notificationFeatures.filter((feature) => normalizeFeaturePath(feature.modulePath) === normalizeFeaturePath(modulePath))
        .filter((feature) => {
            const state = progress[featureKey(feature)];
            return !state?.consulted || !state.visited;
        });
    return (
        <Box position="relative" minW={0} h="full">
            {children}
            {pending.length > 0 && (
                <Button position="absolute" top={{ base: 2, md: 4, lg: 6 }} left={{ base: 2, md: 4, lg: 6 }} zIndex={1} size="xs" rounded="full" colorPalette="purple" onClick={() => openDialog(modulePath)} aria-label={`Ver novedades de ${pending[0].moduleLabel}`}>
                    <LuSparkles aria-hidden="true" /> Nuevo
                </Button>
            )}
        </Box>
    );
}

export function NewFeaturesDialog() {
    const { features, notificationFeatures, progress, dialogOpen, selectedFeature, closeDialog, selectFeature } = useNewFeatures();
    const navigate = useNavigate();
    const closeRef = useRef<HTMLButtonElement>(null);
    const touchStart = useRef<{ x: number; y: number } | null>(null);
    const slideId = useId();
    if (!selectedFeature) return null;
    const selectedIndex = features.indexOf(selectedFeature);
    const multiple = features.length > 1;
    const state = progress[featureKey(selectedFeature)];
    const firstDot = Math.max(0, Math.min(selectedIndex - 3, features.length - 7));
    const dots = features.slice(firstDot, firstDot + 7);
    const move = (direction: number) => {
        const next = features[selectedIndex + direction];
        if (next) selectFeature(next);
    };
    const onKeyDown = (event: KeyboardEvent) => {
        if (event.altKey || event.ctrlKey || event.metaKey || (event.target as HTMLElement).closest("input, textarea, select, [contenteditable=true]")) return;
        if (multiple && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
            event.preventDefault();
            move(event.key === "ArrowRight" ? 1 : -1);
        }
    };
    return (
        <Dialog.Root open={dialogOpen} onOpenChange={({ open }) => { if (!open) closeDialog(); }} initialFocusEl={() => closeRef.current} scrollBehavior="inside" placement="center" lazyMount unmountOnExit>
            <Portal>
                <Dialog.Backdrop className={styles.backdrop} />
                <Dialog.Positioner>
                    <Dialog.Content className={styles.dialog} onKeyDown={onKeyDown}>
                        <Dialog.Header className={styles.header}>
                            <span className={styles.brandMark} aria-hidden="true"><LuSparkles /></span>
                            <span className={styles.brand}>EXOTIC</span>
                            <span className={styles.edition}>Lo nuevo, para ti</span>
                            <Dialog.Title className={styles.srOnly}>Novedades para ti</Dialog.Title>
                            <Dialog.Description className={styles.srOnly}>Mejoras disponibles según tus accesos. Usa Anterior, Siguiente o las flechas del teclado para explorarlas.</Dialog.Description>
                        </Dialog.Header>
                        <Dialog.CloseTrigger asChild><CloseButton ref={closeRef} className={styles.close} size="sm" aria-label="Cerrar novedades" /></Dialog.CloseTrigger>
                        <Dialog.Body className={styles.body}>
                            <div id={slideId} role="group" aria-roledescription="carrusel" aria-label="Novedades disponibles">
                                <p className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">{selectedIndex + 1} de {features.length}. {selectedFeature.title}</p>
                                <div key={`${featureKey(selectedFeature)}-copy`} className={styles.copy}>
                                    <span className={styles.eyebrow}>{selectedFeature.moduleLabel}</span>
                                    <h2 className={styles.title}>{selectedFeature.title}</h2>
                                    <p className={styles.description}>{selectedFeature.description}</p>
                                </div>
                                <div className={styles.copy}>
                                    <Button className={styles.action} onClick={() => {
                                    closeDialog();
                                    navigate(selectedFeature.modulePath);
                                    }}>Ir a {selectedFeature.moduleLabel}<LuArrowUpRight aria-hidden="true" /></Button>
                                </div>
                                <div className={styles.stage} onTouchStart={(event) => {
                                    const touch = event.touches[0];
                                    if (touch) touchStart.current = { x: touch.clientX, y: touch.clientY };
                                }} onTouchEnd={(event) => {
                                    const touch = event.changedTouches[0];
                                    const start = touchStart.current;
                                    touchStart.current = null;
                                    if (!touch || !start || !multiple) return;
                                    const dx = touch.clientX - start.x;
                                    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(touch.clientY - start.y) * 1.3) move(dx < 0 ? 1 : -1);
                                }}>
                                    {selectedIndex > 0 && <div className={`${styles.peek} ${styles.peekLeft}`} aria-hidden="true" />}
                                    {selectedIndex < features.length - 2 && <div className={`${styles.peek} ${styles.peekFar}`} aria-hidden="true" />}
                                    {selectedIndex < features.length - 1 && <div className={`${styles.peek} ${styles.peekRight}`} aria-hidden="true" />}
                                    <div key={featureKey(selectedFeature)} className={styles.visual}>
                                        {selectedFeature.image
                                            ? <img className={styles.featureImage} src={selectedFeature.image.src} alt={selectedFeature.image.alt} draggable={false} />
                                            : <NewFeaturesIllustration feature={selectedFeature} />}
                                    </div>
                                </div>
                                {selectedFeature.image?.caption && <p className={styles.imageCaption}>{selectedFeature.image.caption}</p>}
                                <div className={styles.location}>
                                    <span className={styles.locationLabel}><LuMapPin style={{ display: "inline", marginRight: 5 }} aria-hidden="true" />Dónde encontrarlo</span>
                                    <span className={styles.locationPath}>{selectedFeature.location.map((segment, index) => <span key={`${index}-${segment}`} className={styles.locationSegment}>{index > 0 && <LuChevronRight aria-hidden="true" />}{segment}</span>)}</span>
                                </div>
                                <p className={styles.status}>{notificationFeatures.includes(selectedFeature)
                                    ? <>{state?.visited && <LuCheck aria-hidden="true" />}{state?.visited ? "Ya conoces la novedad y entraste a este módulo." : "Entra también al módulo para completar esta novedad."}</>
                                    : "Esta novedad sigue disponible para consulta, sin indicador Nuevo."}</p>
                            </div>
                        </Dialog.Body>
                        <Dialog.Footer className={`${styles.footer} ${multiple ? "" : styles.singleFooter}`}>
                            {multiple && <span className={styles.footerLabel}>A tu ritmo. Sin perderte nada.</span>}
                            {multiple && <nav className={styles.pagination} aria-label="Elegir novedad">{dots.map((feature, offset) => {
                                const index = firstDot + offset;
                                return <button key={featureKey(feature)} type="button" className={styles.dotButton} aria-controls={slideId} aria-label={`Ver novedad ${index + 1}: ${feature.title}`} aria-current={index === selectedIndex ? "step" : undefined} onClick={() => selectFeature(feature)}><span className={`${styles.dot} ${index === selectedIndex ? styles.dotActive : ""}`} /></button>;
                            })}</nav>}
                            <div className={styles.controls}>
                                {multiple && <><span className={styles.count}>{String(selectedIndex + 1).padStart(2, "0")} / {String(features.length).padStart(2, "0")}</span><Button className={styles.previous} disabled={selectedIndex === 0} aria-label="Novedad anterior" aria-controls={slideId} onClick={() => move(-1)}><LuArrowLeft /></Button></>}
                                <Button className={styles.next} aria-controls={slideId} onClick={() => selectedIndex < features.length - 1 ? move(1) : closeDialog()}>{selectedIndex < features.length - 1 ? <>Siguiente <LuArrowRight aria-hidden="true" /></> : <>Entendido <LuCheck aria-hidden="true" /></>}</Button>
                            </div>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
}
