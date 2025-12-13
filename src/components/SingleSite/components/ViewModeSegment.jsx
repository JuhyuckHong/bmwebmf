import { useMemo } from "react";
import "./ViewModeSegment.css";

const VIEW_MODES = [
    { type: "both", label: "모두", icon: "all" },
    { type: "photo", label: "사진", icon: "photo" },
    { type: "video", label: "영상", icon: "video" },
];

function ViewModeSegment({ mode, onChange }) {
    const activeIndex = useMemo(
        () => VIEW_MODES.findIndex((m) => m.type === mode),
        [mode]
    );

    return (
        <div className="view-mode-segment" role="tablist" aria-label="보기 모드 선택">
            {VIEW_MODES.map((option, index) => (
                <button
                    key={option.type}
                    role="tab"
                    aria-selected={mode === option.type}
                    aria-controls={`panel-${option.type}`}
                    className={`segment-btn ${mode === option.type ? "active" : ""}`}
                    onClick={() => onChange(option.type)}
                >
                    <span className={`segment-icon icon-${option.icon}`} aria-hidden="true" />
                    <span className="segment-label">{option.label}</span>
                </button>
            ))}
            <div
                className="segment-indicator"
                style={{
                    transform: `translateX(${activeIndex * 100}%)`,
                }}
                aria-hidden="true"
            />
        </div>
    );
}

export default ViewModeSegment;
