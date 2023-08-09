import { useState, useEffect } from "react";
import cookie from "react-cookies";
import { API } from "../API";
import "../CSS/AllSites.css";

function AllSites({ setSite }) {
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
    }, []);

    const handleThumbnailClick = (imageName) => setSite(imageName);
    const imageUrlBase = process.env.REACT_APP_API_URL;

    console.log(thumbnails);

    return (
        <div className="thumbnails">
            {thumbnails.map((thumbnail) => {
                const siteInfo = siteInformation[thumbnail.site] || {};

                return (
                    <div key={thumbnail.site} className="thumbnails-individual">
                        <img
                            style={{
                                width: "100%",
                                height: "auto",
                                borderRadius: "5px",
                            }}
                            src={`${imageUrlBase}${
                                thumbnail.url
                            }?${Date.now()}`}
                            alt="thumbnail"
                            loading="lazy"
                            onClick={() => handleThumbnailClick(thumbnail.site)}
                        />
                        <div className="site-information">
                            <p>현장: {thumbnail.site}</p>
                            <p>
                                최근: {formatRecentPhoto(siteInfo.recent_photo)}
                            </p>
                            <p>
                                운영: {formatTime(siteInfo.time_start)}~
                                {formatTime(siteInfo.time_end)}
                            </p>
                            <p>간격: {siteInfo.time_interval}분</p>
                            <p>
                                현재: {siteInfo.photos_count}/
                                {siteInfo.shooting_count_till_now}
                                {"(총 촬영 개수:"}
                                {siteInfo.shooting_count}
                                {")"}
                            </p>
                            <p>원격: {siteInfo.remote_condition}</p>
                            <p>
                                모듈:{" "}
                                {formatDeviceNumber(siteInfo.device_number)}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

const formatRecentPhoto = (photo) => {
    if (!photo) return "";
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
