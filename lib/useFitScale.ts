import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Scales a fixed-width design to fit whatever width its container actually has.
 *
 * Resume templates render at a fixed A4 pixel size (794 × 1123) because export
 * has to be pixel-exact, so a preview has to be transform-scaled to fit.
 * Hardcoding that scale only works at one container width: `scale-[0.44]` is
 * right at 349px and wrong everywhere else, so the CV was cropped by the
 * container's `overflow-hidden` on a phone and left a gap on wider layouts.
 *
 * The returned `ref` is a *callback* ref rather than an object ref. The sidebar
 * renders as an off-canvas drawer on mobile and a static aside on desktop, and
 * crossing that breakpoint mounts a different node — an effect-attached observer
 * would keep watching the detached element and the scale would freeze at
 * whatever the previous layout measured. A callback ref re-attaches the observer
 * to each new node, and the observer then handles plain resizes, rotation and
 * text-size changes on a node that stays put.
 *
 * @param designWidth Intrinsic width of the content being scaled, in px.
 */
export const useFitScale = <T extends HTMLElement = HTMLDivElement>(designWidth: number) => {
    const [scale, setScale] = useState(0);
    const nodeRef = useRef<T | null>(null);
    const observerRef = useRef<ResizeObserver | null>(null);

    const measure = useCallback(() => {
        const element = nodeRef.current;
        if (!element) return;
        const width = element.clientWidth;
        // A hidden or not-yet-laid-out container measures 0; keep the last good
        // scale rather than collapsing the preview to nothing.
        if (width > 0) setScale(width / designWidth);
    }, [designWidth]);

    const ref = useCallback(
        (node: T | null) => {
            observerRef.current?.disconnect();
            observerRef.current = null;
            nodeRef.current = node;
            if (!node) return;

            measure();
            if (typeof ResizeObserver === 'undefined') return;
            const observer = new ResizeObserver(measure);
            observer.observe(node);
            observerRef.current = observer;
        },
        [measure],
    );

    /**
     * Belt and braces for the case that actually matters on a phone: rotating
     * the device. ResizeObserver should cover it, but it is not delivered
     * reliably in every WebView, and a preview stuck at the portrait scale after
     * rotating to landscape is exactly the bug this hook exists to prevent.
     */
    useEffect(() => {
        window.addEventListener('resize', measure);
        window.addEventListener('orientationchange', measure);
        return () => {
            window.removeEventListener('resize', measure);
            window.removeEventListener('orientationchange', measure);
        };
    }, [measure]);

    return { ref, scale };
};
