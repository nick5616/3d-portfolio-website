import { useState, useEffect } from "react";

interface DeviceInfo {
    isMobile: boolean;
}

export const useDeviceDetection = (): DeviceInfo => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            // Check user agent for mobile devices
            const userAgent =
                navigator.userAgent ||
                navigator.vendor ||
                (window as any).opera;
            const mobileRegex =
                /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
            const isMobileUserAgent = mobileRegex.test(userAgent);

            // Check screen size (tablet/mobile breakpoint)
            const isSmallScreen = window.innerWidth <= 768;

            // Check for touch capability
            const isTouchDevice =
                "ontouchstart" in window || navigator.maxTouchPoints > 0;

            // More comprehensive mobile detection
            // Consider it mobile if:
            // 1. Mobile user agent AND touch capable, OR
            // 2. Small screen AND touch capable, OR
            // 3. Specific mobile user agent (even without touch for older devices)
            const isMobileDevice =
                (isMobileUserAgent && isTouchDevice) ||
                (isSmallScreen && isTouchDevice) ||
                /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
                    userAgent
                );

            console.log("Mobile detection:", {
                userAgent: isMobileUserAgent,
                smallScreen: isSmallScreen,
                touch: isTouchDevice,
                result: isMobileDevice,
                width: window.innerWidth,
            });

            setIsMobile(isMobileDevice);
        };

        checkMobile();
        window.addEventListener("resize", checkMobile);
        window.addEventListener("orientationchange", checkMobile);

        return () => {
            window.removeEventListener("resize", checkMobile);
            window.removeEventListener("orientationchange", checkMobile);
        };
    }, []);

    return { isMobile };
};
