import { useEffect, useRef } from 'react';

// The labels that will float next to specific nodes
const LABELS = ['Chennai', 'Pianist', 'Vocalist', 'Beatmaker', 'Producer', 'Lyricist', 'Guitarist'];

interface Node {
    x: number;
    y: number;
    vx: number;
    vy: number;
    label: string | null;
    activeTimer: number; // Used for the "light up" effect
}

export default function NetworkConstellation() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animId: number;
        let nodes: Node[] = [];

        // Colors matching your CSS variables
        const COLOR_PEACH = '255, 212, 202';
        const COLOR_RED = '255, 68, 57';

        const resize = () => {
            // Handle high-DPI (retina) displays for crisp text
            const dpr = window.devicePixelRatio || 1;
            canvas.width = canvas.offsetWidth * dpr;
            canvas.height = canvas.offsetHeight * dpr;
            ctx.scale(dpr, dpr);
            initNodes();
        };

        const initNodes = () => {
            nodes = [];
            const numNodes = 35; // Total dots

            for (let i = 0; i < numNodes; i++) {
                nodes.push({
                    x: Math.random() * canvas.offsetWidth,
                    y: Math.random() * canvas.offsetHeight,
                    vx: (Math.random() - 0.5) * 0.4, // Slow drift velocity X
                    vy: (Math.random() - 0.5) * 0.4, // Slow drift velocity Y
                    label: i < LABELS.length ? LABELS[i] : null, // Assign labels to the first few nodes
                    activeTimer: 0,
                });
            }
        };

        // Randomly trigger a "pulse" on a node to make it light up
        const triggerPulse = () => {
            const randomNode = nodes[Math.floor(Math.random() * nodes.length)];
            randomNode.activeTimer = 150; // Stays lit for 150 frames
            setTimeout(triggerPulse, Math.random() * 3000 + 1000); // Trigger next pulse in 1-4 seconds
        };

        const animate = () => {
            const width = canvas.offsetWidth;
            const height = canvas.offsetHeight;

            ctx.clearRect(0, 0, width, height);

            // 1. Update positions
            nodes.forEach(node => {
                node.x += node.vx;
                node.y += node.vy;

                // Bounce off invisible walls smoothly
                if (node.x <= 0 || node.x >= width) node.vx *= -1;
                if (node.y <= 0 || node.y >= height) node.vy *= -1;

                if (node.activeTimer > 0) node.activeTimer--;
            });

            // 2. Draw connections (Lines)
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const dx = nodes[i].x - nodes[j].x;
                    const dy = nodes[i].y - nodes[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const maxDist = 120; // How close they need to be to connect

                    if (dist < maxDist) {
                        // Opacity fades out the further away they are
                        const opacity = 1 - (dist / maxDist);

                        // If either connected node is "pulsing", turn the line red
                        const isActive = nodes[i].activeTimer > 0 || nodes[j].activeTimer > 0;
                        const rgb = isActive ? COLOR_RED : COLOR_PEACH;
                        const finalOpacity = isActive ? opacity * 0.8 : opacity * 0.2;

                        ctx.beginPath();
                        ctx.moveTo(nodes[i].x, nodes[i].y);
                        ctx.lineTo(nodes[j].x, nodes[j].y);
                        ctx.strokeStyle = `rgba(${rgb}, ${finalOpacity})`;
                        ctx.lineWidth = isActive ? 1.5 : 0.8;
                        ctx.stroke();
                    }
                }
            }

            // 3. Draw Nodes (Dots) and Labels
            nodes.forEach(node => {
                const isActive = node.activeTimer > 0;

                ctx.beginPath();
                ctx.arc(node.x, node.y, isActive ? 3 : 1.5, 0, Math.PI * 2);
                ctx.fillStyle = isActive ? `rgb(${COLOR_RED})` : `rgba(${COLOR_PEACH}, 0.5)`;
                ctx.fill();

                // Draw Labels
                if (node.label) {
                    ctx.fillStyle = `rgba(${COLOR_PEACH}, ${isActive ? 1 : 0.6})`;
                    ctx.font = 'italic 16px "Cormorant Garamond", serif';
                    ctx.fillText(node.label, node.x + 8, node.y + 4);
                }
            });

            animId = requestAnimationFrame(animate);
        };

        resize();
        animate();
        setTimeout(triggerPulse, 1000); // Start the pulsing effect

        window.addEventListener('resize', resize);
        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', resize);
        };
    }, []);

    return (
        <div className="network-card">
            <canvas ref={canvasRef} className="network-canvas" />
        </div>
    );
}