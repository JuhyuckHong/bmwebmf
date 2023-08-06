import { useState, useEffect } from "react";
import { API } from "../API";
import cookie from "react-cookies";

const SelectPhoto = ({ site }) => {
    const [selectedDateIndex, setSelectedDateIndex] = useState(0);
    const [dates, setDates] = useState([]);

    useEffect(() => {
        const authHeader = { Authorization: cookie.load("BM") };

        const getAndSetDateInSite = async () => {
            try {
                const response = await API.getSiteDate(authHeader, site);
                setDates(response.data);
                setSelectedDateIndex(response.data.length - 1);
            } catch (err) {
                console.error("Failed to get date:", err);
            }
        };

        getAndSetDateInSite();
    }, [site]);

    const handleDateChange = (event) => {
        setSelectedDateIndex(event.target.value);
    };

    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
    const [photos, setPhotos] = useState([]);

    useEffect(() => {
        const authHeader = { Authorization: cookie.load("BM") };

        const getAndSetTimeInDate = async () => {
            if (
                selectedDateIndex !== null &&
                dates[selectedDateIndex] !== undefined
            ) {
                try {
                    const response = await API.getSiteDateList(
                        authHeader,
                        site,
                        dates[selectedDateIndex],
                    );
                    setPhotos(response.data);
                    setSelectedPhotoIndex(response.data.length - 1);
                } catch (err) {
                    console.error("Failed to get photos:", err);
                }
            }
        };

        getAndSetTimeInDate();
    }, [selectedDateIndex, dates]);

    const handlePhotoChange = (event) => {
        setSelectedPhotoIndex(event.target.value);
    };

    const [imageUrl, setImageUrl] = useState("");

    useEffect(() => {
        const authHeader = { Authorization: cookie.load("BM") };

        const getAndSetImage = async () => {
            {
                try {
                    const response = await API.getImage(
                        authHeader,
                        site,
                        dates[selectedDateIndex],
                        photos[selectedPhotoIndex]?.split(".")[0],
                    );
                    setImageUrl(URL.createObjectURL(response.data));
                } catch (err) {
                    console.error("Failed to get photos:", err);
                }
            }
        };

        getAndSetImage();
    }, [setSelectedPhotoIndex, selectedPhotoIndex, site]);

    return (
        <>
            <div>
                <input
                    type="range"
                    min={0}
                    max={dates.length - 1}
                    value={selectedDateIndex}
                    onChange={handleDateChange}
                />
            </div>
            <p>Selected Date: {dates[selectedDateIndex]}</p>

            <div>
                <input
                    type="range"
                    min={0}
                    max={photos.length - 1}
                    value={selectedPhotoIndex}
                    onChange={handlePhotoChange}
                />
            </div>
            <p>Selected Photo: {photos[selectedPhotoIndex]}</p>
            <div>
                {imageUrl && (
                    <img
                        src={imageUrl}
                        alt="Recent"
                        style={{
                            maxHeight: "40vh",
                            objectFit: "contain",
                        }}
                    />
                )}
            </div>
        </>
    );
};

export default SelectPhoto;
