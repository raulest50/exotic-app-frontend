import type { FocusEvent } from 'react';

/**
 * Selects all text when the input receives focus so typing replaces the value
 * (useful for integer fields with min >= 1 where empty/intermediate states snap back).
 * Prevents the following mouseup from clearing the selection after a click-to-focus.
 */
export function selectNumericInputContentsOnFocus(
    e: FocusEvent<HTMLInputElement>
): void {
    const target = e.currentTarget;
    const selectAll = (): void => {
        try {
            target.select();
        } catch {
            // ignore selection errors in edge environments
        }
    };
    requestAnimationFrame(selectAll);
    target.addEventListener(
        'mouseup',
        (ev) => {
            ev.preventDefault();
        },
        { once: true }
    );
}
