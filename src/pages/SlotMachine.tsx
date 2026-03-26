import { useState, useEffect } from 'react';

const HAVE_ITEMS = ['the melody.', 'piano chords.', 'the vision.'];
const NEED_ITEMS = ['a lyricist.', 'a producer.', 'the missing piece.'];

export default function SlotMachine() {
    const [phase, setPhase] = useState(0);

    useEffect(() => {
        // Cycles from 0 to 3 every 2.5 seconds. (3 is the Solution state)
        const timer = setInterval(() => {
            setPhase((prev) => (prev + 1) % 4);
        }, 2500);
        return () => clearInterval(timer);
    }, []);

    // When phase is 3, we show the Aalap solution.
    const isSolution = phase === 3;

    // Keep the slots parked on the last item while the solution plays
    const slotIndex = phase === 3 ? 2 : phase;

    return (
        <div className={`slot-machine-card ${isSolution ? 'solution-active' : ''}`}>

            {/* ── THE PROBLEM SLOTS ── */}
            <div className={`slot-content ${isSolution ? 'hidden' : ''}`}>
                <div className="slot-group">
                    <span className="slot-static">YOU HAVE</span>
                    <div className="slot-window">
                        <div
                            className="slot-track"
                            style={{ transform: `translateY(-${slotIndex * (100 / HAVE_ITEMS.length)}%)` }}
                        >
                            {HAVE_ITEMS.map((item, i) => (
                                <span key={`have-${i}`} className="slot-dynamic peach">{item}</span>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="slot-group">
                    <span className="slot-static">YOU NEED</span>
                    <div className="slot-window">
                        <div
                            className="slot-track"
                            style={{ transform: `translateY(-${slotIndex * (100 / NEED_ITEMS.length)}%)` }}
                        >
                            {NEED_ITEMS.map((item, i) => (
                                <span key={`need-${i}`} className="slot-dynamic red">{item}</span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── THE SOLUTION REVEAL ── */}
            <div className={`solution-content ${isSolution ? 'visible' : ''}`}>
                <h3 className="solution-logo">AALAP</h3>
                <p className="solution-text">connects the pieces.</p>
            </div>

        </div>
    );
}