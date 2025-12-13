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
                <button
                    className={`nav-btn prev ${!prevSite ? "disabled" : ""}`}
                    disabled={!prevSite}
                    onClick={() => onNavigate(-1)}
                    aria-label={prevSite ? `이전 현장: ${prevSite}` : "이전 현장 없음"}
                >
                    <span className="nav-arrow">&#8592;</span>
                    <span className="nav-label">
                        {prevSite?.replaceAll("_", " ") || "-"}
                    </span>
                </button>

                <div className="site-title-area">
                    <h1 className="site-name">{siteName?.replaceAll("_", " ")}</h1>
                    <span className="site-position">
                        {currentIndex + 1} / {totalSites}
                    </span>
                </div>

                <button
                    className={`nav-btn next ${!nextSite ? "disabled" : ""}`}
                    disabled={!nextSite}
                    onClick={() => onNavigate(1)}
                    aria-label={nextSite ? `다음 현장: ${nextSite}` : "다음 현장 없음"}
                >
                    <span className="nav-label">
                        {nextSite?.replaceAll("_", " ") || "-"}
                    </span>
                    <span className="nav-arrow">&#8594;</span>
                </button>
            </div>

            {/* 하단: 전체현장 링크 + 뷰모드 */}
            <div className="header-bottom">
                <Link to="/all" className="to-all-link">
                    &#8592; 전체 현장
                </Link>

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