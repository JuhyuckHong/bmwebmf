import { useState, useEffect } from "react";
import { API } from "../API";
import cookie from "react-cookies";

const SelectPhoto = ({ site }) => {
    const [selectedDateIndex, setSelectedDateIndex] = useState(0);
    const [dates, setDates] = useState([]);

    // site 선택한 경우(=thumbnail 선택) 해당 site에서 촬영된 날짜(=folder) 목록을 요청
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

    const handleDateChange = (event) =>
        setSelectedDateIndex(event.target.value);

    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(undefined);
    const [tempPhotoIndex, setTempPhotoIndex] = useState(0);
    const [photos, setPhotos] = useState([]);

    // 날짜를 선택한 경우 해당 날짜(=folder)에 있는 사진 목록을 요청
    useEffect(() => {
        const authHeader = { Authorization: cookie.load("BM") };

        const getAndSetTimeInDate = async () => {
            if (site && dates[selectedDateIndex]) {
                try {
                    const response = await API.getSiteDateList(
                        authHeader,
                        site,
                        dates[selectedDateIndex],
                    );
                    setPhotos(response.data);
                    setTempPhotoIndex(response.data.length - 1);
                } catch (err) {
                    console.error("Failed to get photos:", err);
                }
            }
        };

        getAndSetTimeInDate();
    }, [dates[selectedDateIndex]]);

    // Debouncing
    const handlePhotoChange = (event) => setTempPhotoIndex(event.target.value);
    useEffect(() => {
        const debounce = setTimeout(() => {
            setSelectedPhotoIndex(tempPhotoIndex);
        }, 500);
        return () => clearTimeout(debounce);
    }, [tempPhotoIndex]);

    // 개별 사진 요청을 위한 상태
    const [imageUrl, setImageUrl] = useState("");

    // 개별 사진을 선택한 경우 해당 사진을 요청
    useEffect(() => {
        const authHeader = { Authorization: cookie.load("BM") };
        console.log(dates[selectedDateIndex], photos[photos.length - 1]);

        const getAndSetImage = async () => {
            if (
                site &&
                dates[selectedDateIndex] &&
                photos[selectedPhotoIndex] &&
                dates[selectedDateIndex] ===
                    photos[selectedPhotoIndex].split("_")[0]
            ) {
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
    }, [photos[selectedPhotoIndex]]);

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
                    value={tempPhotoIndex}
                    onChange={handlePhotoChange}
                />
            </div>
            <p>Selected Photo: {photos[tempPhotoIndex]}</p>
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
