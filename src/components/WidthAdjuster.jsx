import { useState, useEffect } from "react";

function WidthAdjuster() {
    // 초기값을 localStorage에서 가져오거나, 없으면 300px로 설정
    const [width, setWidth] = useState(
        () => Number(localStorage.getItem("site-info-width")) || 300,
    );

    useEffect(() => {
        document.documentElement.style.setProperty(
            "--site-info-width",
            `${width}px`,
        );
        // width 값이 변경될 때마다 localStorage에 저장
        localStorage.setItem("site-info-width", width);
    }, [width]);

    const increaseWidth = () => {
        if (width < 500) {
            setWidth((prevWidth) => prevWidth + 25);
        }
    };

    const decreaseWidth = () => {
        if (width > 150) {
            setWidth((prevWidth) => prevWidth - 25);
        }
    };

    return (
        <>
            사진 크기: {width}px
            <button onClick={increaseWidth}>▲</button>
            <button onClick={decreaseWidth}>▼</button>
        </>
    );
}

export default WidthAdjuster;
