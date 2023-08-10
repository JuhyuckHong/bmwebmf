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

    const [staticUrls, setStaticUrls] = useState([]);

    const getStaticUrl = async (url) => {
        try {
            const response = await API.getStatic(
                { Authorization: cookie.load("BM") },
                url,
            );

            console.log(url, response);
            const staticURL = URL.createObjectURL(response.data);
            return staticURL;
        } catch (err) {
            return process.env.REACT_APP_API_URL + "/static/no_image_today.jpg";
        }
    };

    useEffect(() => {
        const fetchStaticUrls = async () => {
            const urls = await Promise.all(
                thumbnails.map(async (thumbnail) => {
                    return getStaticUrl(thumbnail.url);
                }),
            );
            setStaticUrls(urls);
        };
        fetchStaticUrls();
    }, [thumbnails]);

    return (
        <div className="thumbnails">
            {thumbnails.map((thumbnail, index) => {
                const siteInfo = siteInformation[thumbnail.site] || {};
                const imageUrl = staticUrls[index];

                return (
                    <div key={thumbnail.site} className="thumbnails-individual">
                        {imageUrl && (
                            <img
                                style={{
                                    width: "100%",
                                    height: "auto",
                                    borderRadius: "5px",
                                }}
                                src={imageUrl}
                                alt={thumbnail.site}
                                loading="lazy"
                                onClick={() =>
                                    handleThumbnailClick(thumbnail.site)
                                }
                            />
                        )}
                        {siteInfo && (
                            <div className="site-information">
                                <p>현장: {thumbnail.site}</p>
                                <p>
                                    최근:{" "}
                                    {formatRecentPhoto(siteInfo.recent_photo)}
                                </p>
                                <p>
                                    운영: {formatTime(siteInfo.time_start)}~
                                    {formatTime(siteInfo.time_end)}
                                </p>
                                <p>간격: {siteInfo.time_interval}분</p>
                                <p>
                                    현재: {siteInfo.photos_count}/
                                    {siteInfo.shooting_count_till_now}
                                    {"(총 촬영 수:"}
                                    {siteInfo.shooting_count}
                                    {")"}
                                </p>
                                <p>원격: {siteInfo.remote_condition}</p>
                                <p>
                                    모듈:{" "}
                                    {formatDeviceNumber(siteInfo.device_number)}
                                </p>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
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
    return device.replace("bmotion", "");
};

export default AllSites;
