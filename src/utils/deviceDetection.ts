// Pure, synchronous mobile detection - usable both inside React (see useDeviceDetection)
// and at module-eval time (e.g. store initial state) where hooks aren't available.
export const detectIsMobile = (): boolean => {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
        return false;
    }

    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const mobileRegex =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    const isMobileUserAgent = mobileRegex.test(userAgent);

    const isSmallScreen = window.innerWidth <= 768;

    const isTouchDevice =
        "ontouchstart" in window || navigator.maxTouchPoints > 0;

    return (
        (isMobileUserAgent && isTouchDevice) ||
        (isSmallScreen && isTouchDevice) ||
        mobileRegex.test(userAgent)
    );
};
