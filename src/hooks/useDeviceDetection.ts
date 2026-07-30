import { useState, useEffect } from "react";
import { detectIsMobile } from "../utils/deviceDetection";

interface DeviceInfo {
    isMobile: boolean;
}

export const useDeviceDetection = (): DeviceInfo => {
    const [isMobile, setIsMobile] = useState(detectIsMobile);

    useEffect(() => {
        const checkMobile = () => setIsMobile(detectIsMobile());

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
