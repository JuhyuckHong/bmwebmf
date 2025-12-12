import { useState, useEffect } from "react";
import { WidthAdjusterStyle } from '../styled-components/allsites';

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
        // width 값이 변경될 때마다 localStorage에 저장
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
        <WidthAdjusterStyle className="container-adjust">
            <span className="title">사진 크기 </span>
            <div className="adjuster">
                <button onClick={increaseWidth}>▲</button>
                {`${width}px`}
                <button onClick={decreaseWidth}>▼</button>
            </div>
        </WidthAdjusterStyle>
    );
}




export default WidthAdjuster;
