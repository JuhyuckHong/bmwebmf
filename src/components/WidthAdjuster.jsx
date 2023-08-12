import { useState, useEffect } from "react";

function WidthAdjuster() {
    const [width, setWidth] = useState(300); // 초기값 300px

    useEffect(() => {
        document.documentElement.style.setProperty(
            "--site-info-width",
            `${width}px`,
        );
    }, [width]);

    const increaseWidth = () => {
        if (width < 500) {
            // 상한선 500px 체크
            setWidth((prevWidth) => prevWidth + 25);
        }
    };

    const decreaseWidth = () => {
        if (width > 150) {
            // 하한선 150px 체크
            setWidth((prevWidth) => prevWidth - 25);
        }
    };

    return (
        <>
            <button onClick={increaseWidth}>△</button>
            <button onClick={decreaseWidth}>▽</button>
            <span className="width-current-value">사진 크기: {width}px</span>
        </>
    );
}

export default WidthAdjuster;
