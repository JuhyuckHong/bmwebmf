import { useState, useEffect } from "react";

function WidthAdjuster() {
    const MIN_WIDTH = 350;
    const [width, setWidth] = useState(() => {
        const stored = Number(localStorage.getItem("site-info-width"));
        if (Number.isFinite(stored)) {
            return Math.max(stored, MIN_WIDTH);
        }
        return MIN_WIDTH;
    });

    useEffect(() => {
        document.documentElement.style.setProperty(
            "--site-info-width",
            `${width}px`,
        );
        localStorage.setItem("site-info-width", width);
    }, [width]);

    const increaseWidth = () => {
        if (width < 850) {
            setWidth((prevWidth) => Math.min(prevWidth + 25, 850));
        }
    };

    const decreaseWidth = () => {
        if (width > MIN_WIDTH) {
            setWidth((prevWidth) => Math.max(prevWidth - 25, MIN_WIDTH));
        }
    };

    return (
        <div className="control-group">
            <span className="control-label">사진 크기</span>
            <div className="control-value">
                <button className="control-btn small" onClick={increaseWidth}>▲</button>
                <span className="size-display">{width}px</span>
                <button className="control-btn small" onClick={decreaseWidth}>▼</button>
            </div>
        </div>
    );
}




export default WidthAdjuster;
