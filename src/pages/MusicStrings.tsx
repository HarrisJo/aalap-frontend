import { useEffect, useState, useRef } from 'react';

// These coordinates match the percentages in your CSS (avatar-1 to avatar-4)
const AVATAR_POSITIONS = [
    { x: 22, y: 15 }, // Composer (Top Left-ish)
    { x: 62, y: 37 }, // Lyricist (Middle Right-ish)
    { x: 17, y: 65 }, // Singer (Bottom Left-ish)
    { x: 57, y: 83 }, // Producer (Bottom Right-ish)
];

// This defines which dots are connected to each other
const CONNECTIONS = [
    [0, 1], [1, 3], [3, 2], [2, 0], [0, 3]
];

interface Props {
    isHovered: boolean;
}

export default function MusicStrings({ isHovered }: Props) {
    const [phase, setPhase] = useState(0);
    const requestRef = useRef<number>(0);

    // Animation Loop: Updates the 'phase' of the sine wave 60 times per second
    const animate = (time: number) => {
        setPhase(time / 200);
        requestRef.current = requestAnimationFrame(animate);
    };

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(requestRef.current);
    }, []);

    return (
        <svg
            className="avatar-lines-svg"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 1
            }}
        >
            {CONNECTIONS.map(([startIdx, endIdx], i) => {
                const start = AVATAR_POSITIONS[startIdx];
                const end = AVATAR_POSITIONS[endIdx];

                // Find the center point between two avatars
                const midX = (start.x + end.x) / 2;
                const midY = (start.y + end.y) / 2;

                // Increase vibration speed/size if the user is hovering the section
                const amplitude = isHovered ? 1.5 : 0.4;
                const frequency = isHovered ? 2.5 : 1.0;

                // The "Wobble" math: move the midpoint slightly in a circle
                const wobbleX = Math.sin(phase * frequency + i) * amplitude;
                const wobbleY = Math.cos(phase * frequency + i) * amplitude;

                // 'M' = Move to start, 'Q' = Quadratic Curve to end using wobbling midpoint
                const pathData = `M ${start.x} ${start.y} Q ${midX + wobbleX} ${midY + wobbleY} ${end.x} ${end.y}`;

                return (
                    <path
                        key={i}
                        d={pathData}
                        fill="none"
                        stroke={isHovered ? '#FF4439' : '#FFD4CA'} // var(--red) : var(--peach)
                        strokeWidth="0.2"
                        opacity={isHovered ? 0.7 : 0.2}
                        style={{ transition: 'stroke 0.4s, opacity 0.4s' }}
                    />
                );
            })}
        </svg>
    );
}