import { useSceneStore } from "../../stores/sceneStore";

export const Interface: React.FC = () => {
    const { controlMode, setControlMode } = useSceneStore();

    return (
        <div className="fixed inset-0 pointer-events-none">
            <div className="absolute bottom-4 left-4 pointer-events-auto">
                <button
                    onClick={() =>
                        setControlMode(
                            controlMode === "firstPerson"
                                ? "pointAndClick"
                                : "firstPerson"
                        )
                    }
                    className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg"
                >
                    Toggle Control Mode
                </button>
            </div>
        </div>
    );
};
