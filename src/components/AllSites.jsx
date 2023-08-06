import { useState, useEffect } from "react";
import cookie from "react-cookies";
import { API } from "../API";

function AllSites({ setSite }) {
    const [thumbnails, setThumbnails] = useState([]);

    useEffect(() => {
        const fetchThumbnails = () => {
            console.log("a");
            API.getThumbnails({ Authorization: cookie.load("BM") })
                .then((res) => {
                    setThumbnails(res.data?.thumbnail_urls);
                })
                .catch((err) => {
                    console.error(err);
                });
        };

        fetchThumbnails();

        const intervalId = setInterval(
            fetchThumbnails,
            REACT_APP_THUMBNAIL_INTERVAL,
        );

        return () => clearInterval(intervalId);
    }, []);

    const handleThumbnailClick = (imageName) => setSite(imageName);

    return (
        <div
            style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                alignItems: "center",
            }}>
            {thumbnails.map((thumbnail) => (
                <div
                    key={thumbnail.site}
                    style={{ width: "200px", margin: "10px" }}>
                    <img
                        style={{
                            width: "100%",
                            height: "auto",
                            borderRadius: "5px",
                        }}
                        src={
                            process.env.REACT_APP_API_URL +
                            thumbnail.url +
                            `?${new Date().getTime()}`
                        }
                        alt="thumbnail"
                        loading="lazy"
                        onClick={() => handleThumbnailClick(thumbnail.site)}
                    />
                </div>
            ))}
        </div>
    );
}

export default AllSites;
