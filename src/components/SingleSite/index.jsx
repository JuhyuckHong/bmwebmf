import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SiteHeader from "./components/SiteHeader";
import MediaCard from "./components/MediaCard";
import TimelineSelector from "./components/TimelineSelector";
import PhotoViewer from "./components/PhotoViewer";
import VideoViewer from "./components/VideoViewer";
import { usePhotoData } from "./hooks/useMediaData";
import { useVideoData } from "./hooks/useMediaData";
import { useMediaNavigation } from "./hooks/useMediaNavigation";
import "./styles/SingleSite.css";

function SingleSite({ authSites }) {
    const [viewMode, setViewMode] = useState(() => {
        return localStorage.getItem("bm-view-mode") || "both";
    });
    const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
    const navigate = useNavigate();
    const { siteId } = useParams();
    const site = siteId;

    const handleViewModeChange = (mode) => {
        setViewMode(mode);
        localStorage.setItem("bm-view-mode", mode);
    };

    const siteIndex = authSites ? authSites.indexOf(site) : -1;

    // Get surrounding sites for sidebar display (total ~10 items, balanced)
    const totalNearby = 10;
    const availablePrev = siteIndex;
    const availableNext = authSites ? authSites.length - siteIndex - 1 : 0;

    // Calculate how many to show from each side
    let prevCount = Math.min(availablePrev, Math.floor(totalNearby / 2));
    let nextCount = Math.min(availableNext, Math.floor(totalNearby / 2));

    // Fill remaining space with the other side
    if (prevCount < Math.floor(totalNearby / 2)) {
        nextCount = Math.min(availableNext, totalNearby - prevCount);
    } else if (nextCount < Math.floor(totalNearby / 2)) {
        prevCount = Math.min(availablePrev, totalNearby - nextCount);
    }

    const prevSites = authSites ? authSites.slice(siteIndex - prevCount, siteIndex) : [];
    const nextSites = authSites ? authSites.slice(siteIndex + 1, siteIndex + 1 + nextCount) : [];

    // Photo data hook
    const {
        dates: photoDates,
        times: photoTimes,
        selectedDateIndex: photoDateIndex,
        selectedTimeIndex: photoTimeIndex,
        mediaURL: photoURL,
        loading: photoLoading,
        handleDateChange: handlePhotoDateChange,
        handleTimeChange: handlePhotoTimeChange,
        handleDateNav: handlePhotoDateNav,
        handleTimeNav: handlePhotoTimeNav,
    } = usePhotoData(site);

    // Video data hook
    const {
        dates: videoDates,
        selectedDateIndex: videoDateIndex,
        mediaURL: videoURL,
        loading: videoLoading,
        handleDateChange: handleVideoDateChange,
        handleDateNav: handleVideoDateNav,
        videoRef,
    } = useVideoData(site);

    const goToSiteByIndex = (offset) => {
        if (!authSites) return;
        const currentIndex = authSites.indexOf(site);
        const targetSite = authSites[currentIndex + offset];
        if (targetSite) {
            navigate(`/site/${encodeURIComponent(targetSite)}`);
        }
    };

    // 키보드 제어
    useMediaNavigation({
        viewMode,
        onViewModeChange: handleViewModeChange,
        photoHandlers: {
            handleDateNav: handlePhotoDateNav,
            handleTimeNav: handlePhotoTimeNav,
        },
        videoHandlers: {
            handleDateNav: handleVideoDateNav,
        },
        siteHandlers: {
            goToSiteByIndex,
        },
        enabled: true,
    });

    // Redirect if site not in authSites
    useEffect(() => {
        if (!authSites) return;
        if (!authSites.includes(site)) {
            navigate("/", { replace: true });
        }
    }, [authSites, site, navigate]);

    if (!authSites) {
        return null;
    }

    const photoInfo = photoDates.length > 0
        ? `📅 ${photoDateIndex + 1}/${photoDates.length}${photoTimes.length > 0 ? `  📸 ${photoTimeIndex + 1}/${photoTimes.length}` : ''}`
        : '';

    const videoInfo = videoDates.length > 0
        ? `📅 ${videoDateIndex + 1}/${videoDates.length}`
        : '';

    return (
        <div className="single-site-page">
            {/* Floating Navigation Buttons */}
            <div className="floating-buttons">
                <button
                    className="floating-back-btn"
                    onClick={() => navigate("/all")}
                    aria-label="전체 현장으로 돌아가기"
                    title="전체 현장으로 돌아가기"
                >
                    <span className="back-icon">↩</span>
                </button>
                <button
                    className="floating-help-btn"
                    onClick={() => setShowKeyboardHelp(prev => !prev)}
                    aria-label="키보드 단축키"
                    title="키보드 단축키"
                >
                    <span className="help-icon">⌨</span>
                </button>
            </div>

            {showKeyboardHelp && (
                <div className="keyboard-help-overlay" onClick={() => setShowKeyboardHelp(false)}>
                    <div className="keyboard-help-modal" onClick={e => e.stopPropagation()}>
                        <h3>키보드 단축키</h3>
                        <div className="shortcut-group">
                            <h4>탐색</h4>
                            <div className="shortcut-row"><kbd>←</kbd><kbd>→</kbd><span>이전/다음 시간</span></div>
                            <div className="shortcut-row"><kbd>↑</kbd><kbd>↓</kbd><span>이전/다음 날짜</span></div>
                            <div className="shortcut-row"><kbd>[</kbd><kbd>]</kbd><span>이전/다음 현장</span></div>
                        </div>
                        <div className="shortcut-group">
                            <h4>뷰 모드</h4>
                            <div className="shortcut-row"><kbd>1</kbd><span>사진+영상</span></div>
                            <div className="shortcut-row"><kbd>2</kbd><span>사진만</span></div>
                            <div className="shortcut-row"><kbd>3</kbd><span>영상만</span></div>
                        </div>
                        <div className="shortcut-group">
                            <h4>전역</h4>
                            <div className="shortcut-row"><kbd>H</kbd><span>전체 현장으로 이동</span></div>
                            <div className="shortcut-row"><kbd>M</kbd><span>요약보기 (All)</span></div>
                            <div className="shortcut-row"><kbd>ESC</kbd><span>뒤로가기 / 닫기</span></div>
                        </div>
                        <button className="close-help-btn" onClick={() => setShowKeyboardHelp(false)}>닫기</button>
                    </div>
                </div>
            )}

            <div className="main-layout">
                <aside className="sidebar">
                    <SiteHeader
                        siteName={site}
                        currentIndex={siteIndex}
                        totalSites={authSites.length}
                        viewMode={viewMode}
                        onViewModeChange={handleViewModeChange}
                        prevSites={prevSites}
                        nextSites={nextSites}
                        onSiteClick={(targetSite) => navigate(`/site/${encodeURIComponent(targetSite)}`)}
                    />
                </aside>

                <div className="media-content" data-mode={viewMode}>
                {(viewMode === "both" || viewMode === "photo") && (
                    <MediaCard title="사진" type="photo" loading={photoLoading} headerInfo={photoInfo}>
                        <TimelineSelector
                            type="photo"
                            dates={photoDates}
                            times={photoTimes}
                            selectedDateIndex={photoDateIndex}
                            selectedTimeIndex={photoTimeIndex}
                            onDateChange={handlePhotoDateChange}
                            onTimeChange={handlePhotoTimeChange}
                            onDateNav={handlePhotoDateNav}
                            onTimeNav={handlePhotoTimeNav}
                            loading={photoLoading}
                        />
                        <PhotoViewer imageURL={photoURL} loading={photoLoading} />
                    </MediaCard>
                )}

                {(viewMode === "both" || viewMode === "video") && (
                    <MediaCard title="영상" type="video" loading={videoLoading} headerInfo={videoInfo}>
                        <TimelineSelector
                            type="video"
                            dates={videoDates}
                            selectedDateIndex={videoDateIndex}
                            onDateChange={handleVideoDateChange}
                            onDateNav={handleVideoDateNav}
                            loading={videoLoading}
                        />
                        <VideoViewer
                            videoURL={videoURL}
                            loading={videoLoading}
                            videoRef={videoRef}
                        />
                    </MediaCard>
                )}
                </div>
            </div>
        </div>
    );
}

export default SingleSite;
