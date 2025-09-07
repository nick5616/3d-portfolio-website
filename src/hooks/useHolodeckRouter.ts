// src/hooks/useHolodeckRouter.ts
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    getHolodeckExperienceFromURL,
    buildHolodeckURL,
} from "../configs/routing";

export const useHolodeckRouter = () => {
    const location = useLocation();
    const navigate = useNavigate();

    // Get the current experience from URL
    const currentExperience = getHolodeckExperienceFromURL();

    // Navigate to a specific holodeck experience
    const navigateToExperience = (experience: string) => {
        const url = buildHolodeckURL(experience);
        if (location.pathname + location.search !== url) {
            navigate(url, { replace: false });
        }
    };

    // Clear experience (go to basic holodeck)
    const clearExperience = () => {
        const url = buildHolodeckURL();
        if (location.pathname + location.search !== url) {
            navigate(url, { replace: false });
        }
    };

    return {
        currentExperience,
        navigateToExperience,
        clearExperience,
    };
};
