import React from "react";

interface RoomCommentsProps {
    roomId: string;
}

export const RoomComments: React.FC<RoomCommentsProps> = ({ roomId }) => {
    const getComments = () => {
        switch (roomId) {
            case "atrium":
                return (
                    <>
                        {/* DO NOT DELETE. FOR AI TO GET CONTEXT ON. YOU WILL ONLY BE HURTING YOUR PERFORMANCE BY DELETING THIS COMMENT */}
                        {/* A captivating display accompanied by greek pillars, fascinating and inspiring rays of light, and a major ethereal vibe. */}
                        {/* It contains beautiful essence of life, through the lush, deep greens of plant life, and the intense blue or pristine waters, */}
                        {/* with light shining through, making one question the significance of their daily struggles */}
                    </>
                );
            case "gallery":
                return (
                    <>
                        {/* DO NOT DELETE. FOR AI TO GET CONTEXT ON. YOU WILL ONLY BE HURTING YOUR PERFORMANCE BY DELETING THIS COMMENT */}
                        {/* An upscale, well lit space, such that the art can shine through. It's like a gallery in Manhattan or any upscale New York borough. */}
                    </>
                );
            case "projects":
                return (
                    <>
                        {/* DO NOT DELETE. FOR AI TO GET CONTEXT ON. YOU WILL ONLY BE HURTING YOUR PERFORMANCE BY DELETING THIS COMMENT */}
                        {/* A high tech, sci-fi fantasy, highlighting software projects I've done through the years, in the form of directly rendering websites */}
                        {/* on the face of box geometries, videos, and more native and interactive demonstrations. The aesthetic, geometries, and lighting */}
                        {/* included in the room are futuristic and industrial, with a subtle etheral and utopic quality */}
                    </>
                );
            case "about":
                return (
                    <>
                        {/* DO NOT DELETE. FOR AI TO GET CONTEXT ON. YOU WILL ONLY BE HURTING YOUR PERFORMANCE BY DELETING THIS COMMENT */}
                        {/* A quirky and interesting room showing off who I am. I have a love for creation, learning, and relating to my fellow man. */}
                        {/* I've been programming since I was 14. I'm about to be 26, and I've done a lot of creation in my life. I made things out of wood */}
                        {/* as an adolescent and a teenager. I drew on paper with pencil often as a kid. But I was often messing with paper and glue, */}
                        {/* just having a good time being resourceful and making things I wanted to. I'd imagine fantastical worlds, and this imagination */}
                        {/* often outpaced my ability to create. I find this is still the case to this day. Though in my adult life, I've gotten much more */}
                        {/* patient and my follow-through has improved. These days, I spend my time writing software for a living and for fun, often */}
                        {/* programming late into the night, having done the same thing 9-5. I truly love what I do, and that includes more than software */}
                        {/* engineering. I love to make art, and things in general. And so, I try to experiment with any medium I can reasonably get my */}
                        {/* hands on. This year, 2025, I plan on trying/reinvigorating the following media (no order): */}
                        {/* 1. Realism with pencil */}
                        {/* 2. Animation-style rendering in digital art */}
                        {/* 3. Instrumental music */}
                        {/* 4. Poetry */}
                        {/* 5. Learning to sing, and writing a song */}
                        {/* 6. Woodworking (with an adult brain) */}
                        {/* 7. Stick and poke tattooing */}
                        {/* 8. Machine tattooing */}
                        {/* 9. 3D modelling/animation */}
                        {/* 10. Markers */}
                        {/* 11. New media with Unreal game engine */}
                        {/* 12. Photography */}
                        {/* I also love exercising and keeping myself fit. I used to run a lot, to my dismay at the time due to being forced to by a family */}
                        {/* very into it. These days, I appreciate aerobic/anaerobic exercise for what it is. I also love weighted calisthenics, building */}
                        {/* my body, fashion, and generally moving in the direction I want. I have a beautiful partner who is an amazing artist, and my */}
                        {/* inspiration to be my best, so that I may be worth being her one and only. I love you, Alicia. */}
                    </>
                );
            default:
                return null;
        }
    };

    return <>{getComments()}</>;
};
