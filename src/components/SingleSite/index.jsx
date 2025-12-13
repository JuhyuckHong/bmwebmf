import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SiteHeader from "./components/SiteHeader";
import MediaCard from "./components/MediaCard";
import TimelineSelector from "./components/TimelineSelector";
import PhotoViewer from "./components/PhotoViewer";
import VideoViewer from "./components/VideoViewer";
import { usePhotoData } from "./hooks/useMediaData";
import { useVideoData } from "./hooks/useMediaData";
import "./styles/SingleSite.css";

function SingleSite({ authSites }) {
    const [viewMode, setViewMode] = useState(() => {
        return localStorage.getItem("bm-view-mode") || "both";
    });
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

    const prevSite = prevSites.length > 0 ? prevSites[0] : null;
    const nextSite = nextSites.length > 0 ? nextSites[0] : null;

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

    const goToSiteByIndex = (offset) => {
        if (!authSites) return;
        const currentIndex = authSites.indexOf(site);
        const targetSite = authSites[currentIndex + offset];
        if (targetSite) {
            navigate(`/site/${encodeURIComponent(targetSite)}`);
        }
    };

    const photoInfo = photoDates.length > 0
        ? `📅 ${photoDateIndex + 1}/${photoDates.length}${photoTimes.length > 0 ? `  📸 ${photoTimeIndex + 1}/${photoTimes.length}` : ''}`
        : '';

    const videoInfo = videoDates.length > 0
        ? `📅 ${videoDateIndex + 1}/${videoDates.length}`
        : '';

    return (
        <div className="single-site-page">
            {/* Floating Navigation Buttons */}
            <button
                className="floating-back-btn"
                onClick={() => navigate("/all")}
                aria-label="전체 현장으로 돌아가기"
                title="전체 현장으로 돌아가기"
            >
                <span className="back-icon">↩</span>
            </button>

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
