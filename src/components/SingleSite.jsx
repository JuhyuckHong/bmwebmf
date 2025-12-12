import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import SelectPhoto from "./SelectPhoto";
import SelectedVideo from "./SelectedVideo";
import "../CSS/SingleSite.css";

function SingleSite({ authSites }) {
    const [viewMode, setViewMode] = useState("both"); // both, photo, video
    const navigate = useNavigate();
    const { siteId } = useParams();
    const site = siteId;
    const siteIndex = authSites ? authSites.indexOf(site) : -1;
    const prevSite =
        siteIndex > 0 && authSites ? authSites[siteIndex - 1] : null;
    const nextSite =
        siteIndex >= 0 &&
        authSites &&
        siteIndex < authSites.length - 1
            ? authSites[siteIndex + 1]
            : null;

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

    const handleGoToMainPage = () => navigate("/all");
    const handleViewMode = (mode) => setViewMode(mode);

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

    const viewModes = [
        { type: "both", label: "모두" },
        { type: "photo", label: "사진" },
        { type: "video", label: "영상" },
    ];

    return (
        <div className="single-site-container">
            <div className="single-site-control">
                <div className="single-site-control-bar">
                    <Link
                        className="prev-site"
                        to={prevSite ? `/site/${encodeURIComponent(prevSite)}` : "#"}
                        onClick={(e) => {
                            if (!prevSite) e.preventDefault();
                            else goToSiteByIndex(-1);
                        }}>
                        <div className="arrows">{prevSite ? "⬅️ " : ""}</div>
                        {prevSite?.replaceAll("_", " ") || "-"}
                    </Link>
                    <Link className="to-all-button" to="/all" onClick={handleGoToMainPage}>
                        전체현장
                    </Link>
                    <Link
                        className="next-site"
                        to={nextSite ? `/site/${encodeURIComponent(nextSite)}` : "#"}
                        onClick={(e) => {
                            if (!nextSite) e.preventDefault();
                            else goToSiteByIndex(1);
                        }}>
                        {nextSite?.replaceAll("_", " ") || "-"}
                        <div className="arrows">{nextSite ? " ➡️" : ""}</div>
                    </Link>
                </div>
                {/* <div className="spacer"></div> */}
                <div className="single-site-control-format">
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
