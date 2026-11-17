import { LuArrowUpRight, LuCheck, LuLayoutGrid, LuSparkles } from "react-icons/lu";
import type { NewFeature } from "./currentFeatures";
import styles from "./NewFeaturesModule.module.css";

// A deliberately schematic illustration, never a screenshot of business data.
export function NewFeaturesIllustration({ feature }: { feature: NewFeature }) {
    return (
        <div className={styles.illustration} role="img" aria-label={`Ilustración de ${feature.moduleLabel}: ${feature.location.join(", ")}`}>
            <div className={styles.orbitOne} /><div className={styles.orbitTwo} />
            <div className={styles.mockWindow}>
                <div className={styles.mockChrome}>
                    <span className={styles.windowDots}><i /><i /><i /></span>
                    <span>EXOTIC <span className={styles.chromeDivider}>/</span> {feature.moduleLabel}</span>
                    <LuLayoutGrid />
                </div>
                <div className={styles.mockWorkspace}>
                    <div className={styles.mockSidebar} aria-hidden="true">
                        <span className={styles.sidebarLogo}><LuSparkles /></span>
                        <span className={styles.sidebarItem} /><span className={styles.sidebarItemActive} /><span className={styles.sidebarItem} /><span className={styles.sidebarItem} />
                    </div>
                    <div className={styles.mockMain}>
                        <span className={styles.mockEyebrow}>TU ESPACIO DE TRABAJO</span>
                        <strong>{feature.moduleLabel}</strong>
                        <div className={styles.mockTiles}><span /><span /><span /></div>
                        <div className={styles.mockRows}><span /><span /><span /></div>
                    </div>
                </div>
            </div>
            <div className={styles.spotlightCard}>
                <span className={styles.spotlightIcon}><LuSparkles /></span>
                <span className={styles.spotlightEyebrow}>HECHO PARA TI</span>
                <strong>{feature.access.kind === "home" ? <>Todo lo nuevo.<br />A tu alcance.</> : feature.location[feature.location.length - 1]}</strong>
                <span className={styles.spotlightLocation}>{feature.moduleLabel} <LuArrowUpRight /></span>
                <div className={styles.spotlightLine} /><div className={styles.spotlightLineShort} />
            </div>
            <div className={styles.floatingCheck}><span><LuCheck /></span> Solo lo que puedes usar</div>
            <span className={styles.illustrationCaption}>VISTA ILUSTRATIVA</span>
        </div>
    );
}
