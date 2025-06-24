import { useState, useEffect } from "react";
import { detectMobileDevice } from "../stores/sceneStore";

interface DeviceInfo {
    isMobile: boolean;
}

export const useDeviceDetection = (): DeviceInfo => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(detectMobileDevice());
        };

        checkMobile();
        window.addEventListener("resize", checkMobile);

        return () => {
            window.removeEventListener("resize", checkMobile);
        };
    }, []);

    return { isMobile };
};
