import "./SiteHeader.css";

const VIEW_MODES = [
    { type: "both", label: "모두 보기", icon: "all" },
    { type: "photo", label: "사진만 보기", icon: "photo" },
    { type: "video", label: "영상만 보기", icon: "video" },
];

function SiteHeader({
    siteName,
    currentIndex,
    totalSites,
    viewMode,
    onViewModeChange,
    prevSites = [],
    nextSites = [],
    onSiteClick,
}) {
    return (
        <div className="site-header-card">
            {/* 이전 현장들 (위로 갈수록 연하게) */}
            <div className="nearby-sites prev-sites">
                {prevSites.map((site, index) => (
                    <button
                        key={site}
                        className="nearby-site-btn"
                        style={{ opacity: 0.3 + (index / prevSites.length) * 0.4 }}
                        onClick={() => onSiteClick(site)}
                    >
                        {site?.replaceAll("_", " ")}
                    </button>
                ))}
            </div>

            {/* 현재 현장 */}
            <div className="current-site">
                <h1 className="site-name">{siteName?.replaceAll("_", " ")}</h1>
                <span className="site-position">
                    {currentIndex + 1} / {totalSites}
                </span>
            </div>

            {/* 다음 현장들 (아래로 갈수록 연하게) */}
            <div className="nearby-sites next-sites">
                {nextSites.map((site, index) => (
                    <button
                        key={site}
                        className="nearby-site-btn"
                        style={{ opacity: 0.7 - (index / nextSites.length) * 0.4 }}
                        onClick={() => onSiteClick(site)}
                    >
                        {site?.replaceAll("_", " ")}
                    </button>
                ))}
            </div>

            {/* 뷰모드 선택 */}
            <div className="view-mode-section">
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
                </div>
            </div>
        </div>
    );
}

export default SiteHeader;