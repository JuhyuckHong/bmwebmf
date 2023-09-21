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
                    "calc(70vh - 90px)",
                );
                break;
            case "both":
            default:
                rootStyle.setProperty(
                    "--image-video-height",
                    "calc(35vh - 45px)",
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

    const viewModes = [
        { type: "both", label: "모두" },
        { type: "photo", label: "사진" },
        { type: "video", label: "영상" },
    ];

    return (
        <div className="single-site-container">
            <div className="single-site-control">
                <div
                    className="prev-site"
                    onClick={() =>
                        setSite(authSites[authSites?.indexOf(site) - 1])
                    }>
                    <div className="arrows">
                        {authSites[authSites?.indexOf(site) - 1] ? "⬅️ " : ""}
                    </div>
                    {authSites[authSites?.indexOf(site) - 1]?.replaceAll(
                        "_",
                        " ",
                    ) || "-"}
                </div>
                <div className="to-all-button" onClick={handleGoToMainPage}>
                    전체현장
                </div>
                <div
                    className="next-site"
                    onClick={() =>
                        setSite(authSites[authSites?.indexOf(site) + 1])
                    }>
                    {authSites[authSites?.indexOf(site) + 1]?.replaceAll(
                        "_",
                        " ",
                    ) || "-"}
                    <div className="arrows">
                        {authSites[authSites?.indexOf(site) + 1] ? " ➡️" : ""}
                    </div>
                </div>
                <div className="spacer"></div>
                {viewModes.map(
                    (mode) =>
                        viewMode !== mode.type && (
                            <div
                                key={mode.type}
                                className="view-mode"
                                onClick={() => handleViewMode(mode.type)}>
                                {mode.label}
                            </div>
                        ),
                )}
            </div>
            <hr />

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
