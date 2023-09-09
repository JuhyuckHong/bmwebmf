import { useState, useEffect } from "react";
import styled from "styled-components"

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
        <div className="container-adjust">
            <span className="func-title">사진 크기 </span>
            <div className="adjust">
                <button onClick={increaseWidth}>▲</button>
                {`${width}px`}
                <button onClick={decreaseWidth}>▼</button>
            </div>
        </div>
    );
}



export default WidthAdjuster;
