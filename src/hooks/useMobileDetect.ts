import { useDeviceDetection } from "./useDeviceDetection";

/**
 * A hook that detects if the device is mobile
 * This is a wrapper around useDeviceDetection for backward compatibility
 */
export const useMobileDetect = (): boolean => {
    const { isMobile } = useDeviceDetection();
    return isMobile;
};
