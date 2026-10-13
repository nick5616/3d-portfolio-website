import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./index.css";
import "./styles/gem.css";
import { Landing } from "./landing/Landing";

// "/" is the choose-your-adventure landing (tiny, loads first). The Basic
// portfolio and the 3D world are separate chunks fetched only when needed;
// every other path (/atrium, /art-gallery, /holodeck/..., etc.) is the world.
const WorldApp = lazy(() => import("./WorldApp"));
const Basic = lazy(() => import("./basic/Basic"));

// Shown for the moment the world's code is still downloading.
const WorldBoot = () => (
    <div
        style={{
            position: "fixed",
            inset: 0,
            display: "grid",
            placeItems: "center",
            background: "#07060f",
        }}
    >
        <div className="gem gem--green" style={{ padding: "14px 22px", fontWeight: 600 }}>
            Entering the world…
        </div>
    </div>
);

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Landing />} />
                <Route
                    path="/basic"
                    element={
                        <Suspense fallback={null}>
                            <Basic />
                        </Suspense>
                    }
                />
                <Route
                    path="*"
                    element={
                        <Suspense fallback={<WorldBoot />}>
                            <WorldApp />
                        </Suspense>
                    }
                />
            </Routes>
        </BrowserRouter>
    </StrictMode>
);
