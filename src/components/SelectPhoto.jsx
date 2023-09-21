import { useState, useEffect } from "react";
import { API } from "../API";
import cookie from "react-cookies";
import DateSelector from "./DateSelector";
import TimeSelector from "./TimeSelector";

const SelectPhoto = ({ site }) => {
    const [selectedDateIndex, setSelectedDateIndex] = useState(0);
    const [tempDateIndex, setTempDateIndex] = useState(0);
    const [dates, setDates] = useState([]);

    // site 선택한 경우(=thumbnail 선택) 해당 site에서 촬영된 날짜(=folder) 목록을 요청
    useEffect(() => {
        const authHeader = { Authorization: cookie.load("BM") };

        setDates([]);
        setTempDateIndex(0);

        const getAndSetDateInSite = async () => {
            try {
                const response = await API.getSiteDate(authHeader, site);
                setDates(response.data);
                setTempDateIndex(response.data.length - 1);
            } catch (err) {
                console.error("Failed to get date:", err);
            }
        };

        getAndSetDateInSite();
    }, [site]);

    // Debouncing
    const handleDateChange = (event) => setTempDateIndex(event.target.value);
    useEffect(() => {
        const debounce = setTimeout(() => {
            setSelectedDateIndex(tempDateIndex);
        }, 500);
        return () => clearTimeout(debounce);
    }, [tempDateIndex]);

    const handleDateChangeFromCalendar = (event) =>
        setSelectedDateIndex(dates.indexOf(event));
    // 날짜 이동 컨트롤 버튼
    const dateIndexControl = (value) => {
        if (value > 0) {
            setTempDateIndex((prevIndex) => {
                if (prevIndex < dates.length - 1) return prevIndex + 1;
                else return prevIndex;
            });
        } else if (value < 0) {
            setTempDateIndex((prevIndex) => {
                if (prevIndex > 0) return prevIndex - 1;
                else return prevIndex;
            });
        }
    };

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

    const handleTimeChangeFromCalendar = (event) =>
        setTempPhotoIndex(photos.indexOf(event));

    // 날짜 이동 컨트롤 버튼
    const photoIndexControl = (value) => {
        if (value > 0) {
            setTempPhotoIndex((prevIndex) => {
                if (prevIndex < photos.length - 1) return prevIndex + 1;
                else return prevIndex;
            });
        } else if (value < 0) {
            setTempPhotoIndex((prevIndex) => {
                if (prevIndex > 0) return prevIndex - 1;
                else return prevIndex;
            });
        }
    };

    // 개별 사진 요청을 위한 상태
    const [imageURL, setImageURL] = useState("");
    // 이미지 로등 상태
    const [loading, setLoading] = useState(false);

    // 개별 사진을 선택한 경우 해당 사진을 요청
    useEffect(() => {
        const authHeader = { Authorization: cookie.load("BM") };

        const getAndSetImage = async () => {
            if (
                site &&
                dates[selectedDateIndex] &&
                photos[selectedPhotoIndex] &&
                dates[selectedDateIndex] ===
                    photos[selectedPhotoIndex].split("_")[0]
            ) {
                try {
                    // 로딩 시작
                    setLoading(true);
                    const response = await API.getImage(
                        authHeader,
                        site,
                        dates[selectedDateIndex],
                        photos[selectedPhotoIndex]?.split(".")[0],
                    );
                    setImageURL(URL.createObjectURL(response.data));
                    // 로딩 완료
                    setLoading(false);
                } catch (err) {
                    console.error("Failed to get photos:", err);
                }
            }
        };

        getAndSetImage();
    }, [photos[selectedPhotoIndex]]);

    return (
        <>
            <hr />
            <div className="selector-container">
                <span className="input-range-label">날짜</span>
                <input
                    className="input-range-date"
                    name="date"
                    type="range"
                    min={0}
                    max={dates.length - 1}
                    value={tempDateIndex}
                    step={1}
                    onChange={handleDateChange}
                    list="dateTicks"
                />
                <datalist id="dateTicks">
                    {dates.map((date, index) => (
                        <option value={index} key={index} />
                    ))}
                </datalist>
                <span
                    className="date-control-button"
                    onClick={() => dateIndexControl(-1)}>
                    {parseInt(tempDateIndex) === 0 ? "-" : "<"}
                </span>
                <DateSelector
                    className="input-range-value"
                    inputDates={dates}
                    handleDateChangeFromCalendar={handleDateChangeFromCalendar}
                    tempDateIndex={tempDateIndex}
                />
                <span
                    className="date-control-button"
                    onClick={() => dateIndexControl(1)}>
                    {parseInt(tempDateIndex) === dates.length - 1 ? "-" : ">"}
                </span>
            </div>
            <hr />
            <div className="selector-container">
                <span className="input-range-label">시간</span>
                <input
                    className="input-range-photo"
                    name="photo"
                    type="range"
                    min={0}
                    max={photos.length - 1}
                    value={tempPhotoIndex}
                    step={1}
                    onChange={handlePhotoChange}
                    list="photoTicks"
                />
                <datalist id="photoTicks">
                    {photos.map((photo, index) => (
                        <option value={index} key={index} />
                    ))}
                </datalist>
                <span
                    className="date-control-button"
                    onClick={() => photoIndexControl(-1)}>
                    {parseInt(tempPhotoIndex) === 0 ? "-" : "<"}
                </span>
                <TimeSelector
                    className="input-range-value"
                    inputTimes={photos}
                    handleTimeChangeFromCalendar={handleTimeChangeFromCalendar}
                    tempPhotoIndex={tempPhotoIndex}
                />
                <span
                    className="date-control-button"
                    onClick={() => photoIndexControl(1)}>
                    {parseInt(tempPhotoIndex) === photos.length - 1 ? "-" : ">"}
                </span>
            </div>
            <hr />
            <div className="photo-container">
                {loading ? (
                    <div className="spinner"></div>
                ) : (
                    imageURL && <img src={imageURL} alt="Selected Photo" />
                )}
            </div>
        </>
    );
};

export default SelectPhoto;
