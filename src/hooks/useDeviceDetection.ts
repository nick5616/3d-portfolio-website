import { useState, useEffect } from "react";

interface DeviceInfo {
    isMobile: boolean;
}

export const useDeviceDetection = (): DeviceInfo => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            const userAgent =
                navigator.userAgent ||
                navigator.vendor ||
                (window as any).opera;
            const mobileRegex =
                /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
            setIsMobile(
                mobileRegex.test(userAgent) || window.innerWidth <= 768
            );
        };

        checkMobile();
        window.addEventListener("resize", checkMobile);

        return () => {
            window.removeEventListener("resize", checkMobile);
        };
    }, []);

    return { isMobile };
};
