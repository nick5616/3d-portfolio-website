import { useState, useEffect } from "react";

interface DeviceInfo {
    isMobile: boolean;
    isSafari: boolean;
    isDuckDuckGo: boolean;
    isWebKitBased: boolean;
}

export const useDeviceDetection = (): DeviceInfo => {
    const [isMobile, setIsMobile] = useState(false);
    const [isSafari, setIsSafari] = useState(false);
    const [isDuckDuckGo, setIsDuckDuckGo] = useState(false);
    const [isWebKitBased, setIsWebKitBased] = useState(false);

    useEffect(() => {
        const checkDeviceAndBrowser = () => {
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

            // Browser-specific detection
            const safariDetection = /^((?!chrome|android).)*safari/i.test(userAgent);
            const webkitDetection = /webkit/i.test(userAgent);
            const duckDuckGoDetection = /DuckDuckGo/i.test(userAgent);

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

            console.log("Device and Browser detection:", {
                userAgent: isMobileUserAgent,
                smallScreen: isSmallScreen,
                touch: isTouchDevice,
                mobile: isMobileDevice,
                safari: safariDetection,
                webkit: webkitDetection,
                duckduckgo: duckDuckGoDetection,
                width: window.innerWidth,
                fullUserAgent: userAgent
            });

            setIsMobile(isMobileDevice);
            setIsSafari(safariDetection);
            setIsDuckDuckGo(duckDuckGoDetection);
            setIsWebKitBased(webkitDetection);
        };

        checkDeviceAndBrowser();
        window.addEventListener("resize", checkDeviceAndBrowser);
        window.addEventListener("orientationchange", checkDeviceAndBrowser);

        return () => {
            window.removeEventListener("resize", checkDeviceAndBrowser);
            window.removeEventListener("orientationchange", checkDeviceAndBrowser);
        };
    }, []);

    return { isMobile, isSafari, isDuckDuckGo, isWebKitBased };
};
