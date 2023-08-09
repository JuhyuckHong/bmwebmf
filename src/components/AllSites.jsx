import { useState, useEffect } from "react";
import cookie from "react-cookies";
import { API } from "../API";
import "../CSS/AllSites.css";

function AllSites({ setSite }) {
    const [thumbnails, setThumbnails] = useState([]);

    useEffect(() => {
        const fetchThumbnails = () => {
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
            process.env.REACT_APP_THUMBNAIL_INTERVAL,
        );

        return () => clearInterval(intervalId);
    }, []);

    const handleThumbnailClick = (imageName) => setSite(imageName);

    return (
        <div className="thumbnails">
            {thumbnails.map((thumbnail) => (
                <div key={thumbnail.site} className="thumbnails-individual">
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
