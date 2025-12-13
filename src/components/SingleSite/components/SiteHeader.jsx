import { Link } from "react-router-dom";
import "./SiteHeader.css";

const VIEW_MODES = [
    { type: "both", label: "모두", icon: "all" },
    { type: "photo", label: "사진", icon: "photo" },
    { type: "video", label: "영상", icon: "video" },
];

function SiteHeader({
    siteName,
    prevSite,
    nextSite,
    currentIndex,
    totalSites,
    onNavigate,
    viewMode,
    onViewModeChange,
}) {
    return (
        <header className="site-header-card">
            {/* 상단: 네비게이션 */}
            <div className="header-top">
                <div className="site-title-area">
                    <h1 className="site-name">{siteName?.replaceAll("_", " ")}</h1>
                    <span className="site-position">
                        {currentIndex + 1} / {totalSites}
                    </span>
                </div>
            </div>

            {/* 하단: 전체현장 링크 + 뷰모드 */}
            <div className="header-bottom">
                <div className="view-mode-segment" role="tablist">
                    {VIEW_MODES.map((option) => (
                        <button
                            key={option.type}
                            role="tab"
                            aria-selected={viewMode === option.type}
                            className={`segment-btn ${viewMode === option.type ? "active" : ""}`}
                            onClick={() => onViewModeChange(option.type)}
                        >
                            <span className={`segment-icon icon-${option.icon}`} aria-hidden="true" />
                            <span className="segment-label">{option.label}</span>
                        </button>
                    ))}
                    <div
                        className="segment-indicator"
                        style={{
                            transform: `translateX(${VIEW_MODES.findIndex((m) => m.type === viewMode) * 100}%)`,
                        }}
                        aria-hidden="true"
                    />
                </div>

                <div className="header-spacer" />
            </div>
        </header>
    );
}

export default SiteHeader;