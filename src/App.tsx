import { Scene } from "./components/core/Scene";
import { Interface } from "./components/ui/Interface";

export default function App() {
    return (
        <main style={{ width: "100%", height: "100%" }}>
            <Scene />
            <Interface />
        </main>
    );
}
