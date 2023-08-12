import { useState, useEffect, useMemo } from "react";
import cookie from "react-cookies";
import { API } from "../API";
import "../CSS/AllSites.css";
import WidthAdjuster from "./WidthAdjuster";

function AllSites({ setSite, reload }) {
    const [thumbnails, setThumbnails] = useState([]);
    const [siteInformation, setSiteInformation] = useState({});

    const fetchData = (fetchFunction, setStateFunction) => {
        fetchFunction({ Authorization: cookie.load("BM") })
            .then((res) => {
                setStateFunction(res.data);
            })
            .catch((err) => {
                console.error(err);
            });
    };

    useEffect(() => {
        fetchData(API.getThumbnails, setThumbnails);
        fetchData(API.getAllInformation, setSiteInformation);

        const intervalId = setInterval(() => {
            fetchData(API.getThumbnails, setThumbnails);
            fetchData(API.getAllInformation, setSiteInformation);
        }, process.env.REACT_APP_THUMBNAIL_INTERVAL);

        return () => clearInterval(intervalId);
    }, [reload]);

    const handleThumbnailClick = (imageName) => setSite(imageName);

    const [staticURLs, setStaticURLs] = useState({});

    const getStaticURL = async (url) => {
        try {
            const response = await API.getStatic(
                { Authorization: cookie.load("BM") },
                url,
            );

            const staticURL = URL.createObjectURL(response.data);
            return staticURL;
        } catch (err) {
            return process.env.REACT_APP_API_URL + "/static/no_image_today.jpg";
        }
    };

    useEffect(() => {
        const fetchStaticURLs = async () => {
            // get static url concurrently
            const URLs = await Promise.all(
                thumbnails.map(async (thumbnail) => {
                    const url = await getStaticURL(thumbnail.url);
                    return { site: thumbnail.site, url };
                }),
            );

            // to make {site: url} object
            const urlsObj = URLs.reduce((acc, curr) => {
                acc[curr.site] = curr.url;
                return acc;
            }, {});

            setStaticURLs(urlsObj);
        };
        fetchStaticURLs();
    }, [thumbnails]);

    // Sorting state and function, useMemo for optimization
    const [sorting, setSorting] = useState(true);
    const handleSorting = () => setSorting((prev) => !prev);
    const sortFunc = (a, b) => {
        if (sorting) {
            const nameA = a.site.toUpperCase();
            const nameB = b.site.toUpperCase();
            return nameA.localeCompare(nameB);
        } else {
            const nameA = siteInformation[a.site]?.device_number || "";
            const nameB = siteInformation[b.site]?.device_number || "";
            return nameA.localeCompare(nameB);
        }
    };
    const sortedThumbnails = useMemo(() => {
        return [...thumbnails].sort(sortFunc);
    }, [thumbnails, sorting, siteInformation]);

    return (
        <>
            <div className="sorting">
                <button onClick={handleSorting}>
                    {sorting ? "모듈번호 정렬" : "현장이름 정렬"}
                </button>
                <WidthAdjuster />
            </div>
            <div className="thumbnails">
                {sortedThumbnails.map((thumbnail) => {
                    const siteInfo = siteInformation[thumbnail.site] || {};
                    const imageURL = staticURLs[thumbnail.site];
                    const siteStatus = getSiteStatus(siteInfo);

                    return (
                        <div
                            key={thumbnail.site}
                            className={`thumbnails-individual ${siteStatus}`}>
                            {imageURL && (
                                <img
                                    style={{
                                        width: "100%",
                                        height: "auto",
                                        borderRadius: "5px",
                                    }}
                                    src={imageURL}
                                    alt={thumbnail.site}
                                    loading="lazy"
                                    onClick={() =>
                                        handleThumbnailClick(thumbnail.site)
                                    }
                                />
                            )}
                            {siteInfo && (
                                <div className="site-information">
                                    <p>
                                        <br />
                                        <span>현장:</span>
                                        <span className="site-name">{` ${thumbnail.site} `}</span>
                                        <br />
                                        <span className="recent-photo">{`최근: ${formatRecentPhoto(
                                            siteInfo.recent_photo,
                                        )}`}</span>
                                        <br />
                                        <span className="operation-time">
                                            {`운영: ${formatTime(
                                                siteInfo.time_start,
                                            )} ~ ${formatTime(
                                                siteInfo.time_end,
                                            )} (간격: ${
                                                siteInfo.time_interval
                                            }분)`}
                                        </span>
                                        <br />
                                        <span>
                                            {`촬영: ${siteInfo.photos_count} `}
                                        </span>
                                        <span
                                            className={getMissingPhotosClass(
                                                siteInfo.photos_count,
                                                siteInfo.shooting_count_till_now,
                                            )}>{`(${
                                            siteInfo.shooting_count_till_now -
                                            siteInfo.photos_count
                                        }개 누락)`}</span>
                                        <span className="today-total-photo">{` (오늘: ${siteInfo.shooting_count})`}</span>
                                        <br />
                                        <span>원격:&nbsp;</span>
                                        <span
                                            className={`remote-status ${
                                                siteInfo.ssh
                                                    ? "remote-on"
                                                    : "remote-off"
                                            } `}>{` ${
                                            siteInfo.ssh ? "O" : "X"
                                        } `}</span>
                                        <span className="device-number">
                                            (
                                            {`${formatDeviceNumber(
                                                siteInfo.device_number,
                                            )}번`}
                                            )
                                        </span>
                                        <br />
                                    </p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </>
    );
}

const formatRecentPhoto = (photo) => {
    if (photo === "No Photo Available" || !photo) return photo;
    const [date, time] = photo.split("_");
    return `${date?.replaceAll("-", "/")} ${time
        ?.split(".")[0]
        .replaceAll("-", ":")}`;
};

const formatTime = (time) => {
    if (!time) return "";
    return `${time.slice(0, 2)}:${time.slice(2)}`;
};

const formatDeviceNumber = (device) => {
    if (!device) return "";
    return parseInt(device.replace("bmotion", ""));
};

const getSiteStatus = (siteInfo) => {
    const currentTime = new Date().getHours() + new Date().getMinutes() / 60;
    const startTime =
        parseInt(siteInfo.time_start?.slice(0, 2)) +
        parseInt(siteInfo.time_start?.slice(2)) / 60;
    const endTime =
        parseInt(siteInfo.time_end?.slice(0, 2)) +
        parseInt(siteInfo.time_end?.slice(2)) / 60;

    const operational = currentTime >= startTime && currentTime <= endTime;
    const missing = siteInfo.shooting_count_till_now - siteInfo.photos_count;
    const remote = siteInfo.ssh;

    if (!operational) return "not-operational-time";
    if (missing >= 5 && !remote) return "need-solution";
    if (missing >= 5 && remote) return "need-check";
    if (missing < 5 && !remote) return "remote-issue";
    if (missing < 5 && remote) return "operational";

    return "";
};

const getMissingPhotosClass = (photosCount, shootingCount) => {
    const missing = shootingCount - photosCount;
    if (missing >= 5) return "missing-high";
    if (missing >= 1) return "missing-medium";
    return "";
};
export default AllSites;
