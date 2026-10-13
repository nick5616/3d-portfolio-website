import React, { useMemo } from "react";
import { RoomConfig } from "../../types/scene.types";
import { AchievementPlaque } from "../models/AchievementPlaque";
import { TrophyCenterpiece } from "./achievements/TrophyCenterpiece";
import { useRupeeStore, RUPEE_TYPES } from "../../stores/rupeeStore";
import { useAchievementStore, ACHIEVEMENTS } from "../../stores/achievementStore";
import { buildPlaqueLayout } from "../../utils/plaqueWallLayout";
import { archwayDirection, CardinalDirection } from "../../utils/archwayDirection";

interface AchievementsRoomProps {
    config: RoomConfig;
    materials: any;
    wallThickness: number;
    width: number;
    height: number;
    depth: number;
}

interface PlaqueEntry {
    key: string;
    title: string;
    subtitle: string;
    accentColor: string;
    locked: boolean;
    icon: "rupee" | "gem";
}

export const AchievementsRoom: React.FC<AchievementsRoomProps> = ({
    config,
    wallThickness,
    width,
    height,
    depth,
}) => {
    const rupees = useRupeeStore((state) => state.rupees);
    const unlocked = useAchievementStore((state) => state.unlocked);
    const wallet = useRupeeStore((state) => state.totalValue);
    const unlockedCount = ACHIEVEMENTS.filter((a) => unlocked[a.id]).length;

    // Never hang a plaque on the wall that has the doorway back to the atrium.
    const doorWalls = useMemo(() => {
        const dirs = new Set<CardinalDirection>();
        config.archways.forEach((archway) =>
            dirs.add(archwayDirection(archway.position))
        );
        return dirs;
    }, [config.archways]);

    const entries = useMemo<PlaqueEntry[]>(() => {
        const rupeeEntries: PlaqueEntry[] = RUPEE_TYPES.map((rupeeType) => ({
            key: `rupee-${rupeeType.name}`,
            title: `${rupeeType.name} Rupee`,
            subtitle: `Collected: ${rupees[rupeeType.name]?.count ?? 0}`,
            accentColor: rupeeType.color,
            locked: false,
            icon: "rupee",
        }));

        const achievementEntries: PlaqueEntry[] = ACHIEVEMENTS.map(
            (achievement) => {
                const isUnlocked = !!unlocked[achievement.id];
                return {
                    key: `achievement-${achievement.id}`,
                    title: isUnlocked ? achievement.title : "???",
                    subtitle: isUnlocked
                        ? achievement.description
                        : achievement.hint,
                    accentColor: isUnlocked ? "#FFD700" : "#4a4a4a",
                    locked: !isUnlocked,
                    icon: "gem",
                };
            }
        );

        return [...rupeeEntries, ...achievementEntries];
    }, [rupees, unlocked]);

    const layout = useMemo(
        () =>
            buildPlaqueLayout(
                entries.length,
                width,
                height,
                depth,
                wallThickness,
                doorWalls
            ),
        [entries.length, width, height, depth, wallThickness, doorWalls]
    );

    return (
        <group>
            {/* Warm, low lighting: a chandelier over the dais does most of it */}
            <hemisphereLight intensity={0.3} color="#ffe9c7" groundColor="#2a1a10" />
            <pointLight
                position={[0, height - 1.6, 0]}
                intensity={9}
                distance={18}
                decay={1.6}
                color="#ffd9a0"
            />
            {Array.from({ length: 4 }, (_, i) => {
                const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
                return (
                    <pointLight
                        key={i}
                        position={[Math.cos(angle) * width * 0.32, height * 0.55, Math.sin(angle) * depth * 0.32]}
                        intensity={1.6}
                        distance={9}
                        decay={1.8}
                        color="#fff0d6"
                    />
                );
            })}

            <TrophyCenterpiece
                height={height}
                depth={depth}
                unlockedCount={unlockedCount}
                totalCount={ACHIEVEMENTS.length}
                rupees={rupees}
                wallet={wallet}
            />

            {entries.map((entry, index) => {
                const slot = layout[index];
                if (!slot) return null;
                return (
                    <AchievementPlaque
                        key={entry.key}
                        position={slot.position}
                        rotation={slot.rotation}
                        title={entry.title}
                        subtitle={entry.subtitle}
                        accentColor={entry.accentColor}
                        locked={entry.locked}
                        icon={entry.icon}
                    />
                );
            })}
        </group>
    );
};
