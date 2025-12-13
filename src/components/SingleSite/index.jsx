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
    const [viewMode, setViewMode] = useState("both");
    const navigate = useNavigate();
    const { siteId } = useParams();
    const site = siteId;

    const siteIndex = authSites ? authSites.indexOf(site) : -1;
    const prevSite = siteIndex > 0 && authSites ? authSites[siteIndex - 1] : null;
    const nextSite =
        siteIndex >= 0 && authSites && siteIndex < authSites.length - 1
            ? authSites[siteIndex + 1]
            : null;

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

    return (
        <div className="single-site-page">
            <SiteHeader
                siteName={site}
                prevSite={prevSite}
                nextSite={nextSite}
                currentIndex={siteIndex}
                totalSites={authSites.length}
                onNavigate={goToSiteByIndex}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
            />

            <div className="media-content" data-mode={viewMode}>
                {(viewMode === "both" || viewMode === "photo") && (
                    <MediaCard title="사진" type="photo" loading={photoLoading}>
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
                    <MediaCard title="영상" type="video" loading={videoLoading}>
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
    );
}

export default SingleSite;
