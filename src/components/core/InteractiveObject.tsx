// src/components/core/InteractiveObject.tsx
import * as THREE from "three";
import { Text } from "@react-three/drei";
import { InteractiveElement } from "../../types/scene.types";
import { GreekPillar } from "../models/GreekPillar";
import { DisplayPillar } from "../models/DisplayPillar";
import { ProjectDisplay } from "../models/ProjectDisplay";
import { ArtFrame } from "../models/ArtFrame";
import { Web3DDisplay } from "../models/Web3DDisplay";

interface InteractiveObjectProps {
    element: InteractiveElement;
}

export const InteractiveObject: React.FC<InteractiveObjectProps> = ({
    element,
}) => {
    const {
        type,
        position,
        rotation = [0, 0, 0],
        scale = [1, 1, 1],
        content,
    } = element;

    switch (type) {
        case "model":
            if (content === "greek-pillar") {
                return <GreekPillar position={position} scale={scale} />;
            } else if (content === "display-pillar") {
                return <DisplayPillar position={position} scale={scale} />;
            } else if (content === "project-display") {
                return (
                    <ProjectDisplay
                        position={position}
                        scale={scale}
                        rotation={rotation}
                    />
                );
            } else if (content.type === "art-frame") {
                return (
                    <ArtFrame
                        position={position}
                        rotation={rotation}
                        scale={scale}
                        imageUrl={content.imageUrl}
                    />
                );
            }
            return null;

        case "web":
            return (
                <Web3DDisplay
                    position={position}
                    rotation={rotation}
                    scale={scale}
                    url={content.url}
                    title={content.title}
                    description={content.description}
                    screenshotUrl={content.screenshotUrl}
                    responsive={content.responsive}
                />
            );

        case "text":
            return (
                <Text
                    position={position}
                    rotation={rotation}
                    scale={scale}
                    color="#ffffff"
                    anchorX="center"
                    anchorY="middle"
                >
                    {content}
                </Text>
            );

        case "image":
            return (
                <mesh position={position} rotation={rotation} scale={scale}>
                    <planeGeometry args={[1, 1]} />
                    <meshStandardMaterial
                        map={new THREE.TextureLoader().load(content)}
                    />
                </mesh>
            );

        default:
            return null;
    }
};
