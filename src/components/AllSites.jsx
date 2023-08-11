import { useState, useEffect } from "react";
import cookie from "react-cookies";
import { API } from "../API";
import "../CSS/AllSites.css";

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

    // Sorting state
    const [sorting, setSorting] = useState(true);
    const handleSorting = () => setSorting((prev) => !prev);

    return (
        <>
            <div className="sorting">
                <button onClick={handleSorting}>
                    {sorting ? "모듈번호 순으로" : "현장이름 순으로"}
                </button>
            </div>
            <div className="thumbnails">
                {thumbnails
                    .sort((a, b) => {
                        if (sorting) {
                            const nameA = a.site.toUpperCase();
                            const nameB = b.site.toUpperCase();
                            if (nameA < nameB) return -1;
                            if (nameA > nameB) return 1;
                            return 0;
                        } else {
                            const nameA = siteInformation[a.site].device_number;
                            const nameB = siteInformation[b.site].device_number;
                            if (nameA < nameB) return -1;
                            if (nameA > nameB) return 1;
                            return 0;
                        }
                    })
                    .map((thumbnail) => {
                        const siteInfo = siteInformation[thumbnail.site] || {};
                        const imageURL = staticURLs[thumbnail.site];

                        return (
                            <div
                                key={thumbnail.site}
                                className="thumbnails-individual">
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
                                        <p>{`현장: ${
                                            thumbnail.site
                                        } (${formatDeviceNumber(
                                            siteInfo.device_number,
                                        )})`}</p>
                                        <p>
                                            {`최근: ${formatRecentPhoto(
                                                siteInfo.recent_photo,
                                            )}`}
                                        </p>
                                        <p>
                                            {`운영: ${formatTime(
                                                siteInfo.time_start,
                                            )} ~ ${formatTime(
                                                siteInfo.time_end,
                                            )} (간격: ${
                                                siteInfo.time_interval
                                            }분)`}
                                        </p>
                                        <p>
                                            {`촬영: ${siteInfo.photos_count} (${
                                                siteInfo.shooting_count_till_now -
                                                siteInfo.photos_count
                                            }개 누락) (오늘 예정: ${
                                                siteInfo.shooting_count
                                            })`}
                                        </p>
                                        <p>{`원격: ${
                                            siteInfo.ssh ? "O" : "X"
                                        }`}</p>
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
    return `${date?.replaceAll("-", "/")} ${time?.replaceAll("-", ":")}`;
};

const formatTime = (time) => {
    if (!time) return "";
    return `${time.slice(0, 2)}:${time.slice(2)}`;
};

const formatDeviceNumber = (device) => {
    if (!device) return "";
    return parseInt(device.replace("bmotion", ""));
};

export default AllSites;
