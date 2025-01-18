import { Scene } from "./components/core/Scene";
import Interface from "./components/ui/Interface";

export default function App() {
    return (
        <main className="h-screen w-screen relative">
            {/* Scene container maintains its original size */}
            <div className="h-[95vh] w-full">
                <Scene />
            </div>
            {/* Interface is absolutely positioned over everything */}
            <div className="absolute inset-x-0 bottom-0">
                <Interface />
            </div>
        </main>
    );
}
