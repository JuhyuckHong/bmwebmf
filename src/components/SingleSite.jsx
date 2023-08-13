import { useState, useEffect } from "react";
import SelectPhoto from "./SelectPhoto";
import SelectedVideo from "./SelectedVideo";
import "../CSS/SingleSite.css";

function SingleSite({ site, setSite, authSites }) {
    const [viewMode, setViewMode] = useState("both"); // both, photo, video

    useEffect(() => {
        const rootStyle = document.documentElement.style;

        switch (viewMode) {
            case "photo":
            case "video":
                rootStyle.setProperty(
                    "--image-video-height",
                    "calc(70vh - 30px)",
                );
                break;
            case "both":
            default:
                rootStyle.setProperty(
                    "--image-video-height",
                    "calc(35vh - 15px)",
                );
                break;
        }
    }, [viewMode]);

    const handleGoToMainPage = () => setSite(null);
    const handleViewMode = (mode) => setViewMode(mode);

    // authSites 배열 안에 site가 없는 경우 alert & site 초기화
    if (!authSites.includes(site)) {
        setSite(null);
        return null;
    }

    return (
        <div className="single-site-container">
            <div>
                <button className="to-all-button" onClick={handleGoToMainPage}>
                    전체 현장 보기
                </button>
                <button
                    className={viewMode === "both" ? "active" : "inactive"}
                    onClick={() => handleViewMode("both")}>
                    사진&영상
                </button>
                <button
                    className={viewMode === "photo" ? "active" : "inactive"}
                    onClick={() => handleViewMode("photo")}>
                    사진
                </button>
                <button
                    className={viewMode === "video" ? "active" : "inactive"}
                    onClick={() => handleViewMode("video")}>
                    영상
                </button>
            </div>

            <h2>{site}</h2>

            {(viewMode === "both" || viewMode === "photo") && (
                <SelectPhoto site={site} />
            )}
            {(viewMode === "both" || viewMode === "video") && (
                <SelectedVideo site={site} />
            )}
        </div>
    );
}

export default SingleSite;
