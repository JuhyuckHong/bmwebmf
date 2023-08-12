import { useState, useEffect, useRef } from "react";
import cookie from "react-cookies";
import { API } from "../API";
import "../CSS/LoadingSpinner.css";

function SelectedVideo({ site }) {
    const [selectedDateIndex, setSelectedDateIndex] = useState(undefined);
    const [tempDateIndex, setTempDateIndex] = useState(0);
    const [dates, setDates] = useState([]);

    // video ref hook
    const videoRef = useRef(null);

    // site 선택한 경우(=thumbnail 선택) 해당 site에서 촬영된 날짜(=folder) 목록을 요청
    useEffect(() => {
        const authHeader = { Authorization: cookie.load("BM") };

        const getAndSetDateInSite = async () => {
            try {
                const response = await API.getSiteDailyVideoList(
                    authHeader,
                    site,
                );
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

    // 개별 영상 요청을 위한 상태
    const [videoURL, setVideoURL] = useState("");
    // 비디오 로딩 상태
    const [loading, setLoading] = useState(false);

    // 날짜를 선택한 경우 해당 날짜(=folder)의 daily 영상을 요청
    useEffect(() => {
        // 날짜 변경 시 영상 정지하고 시간 0으로 변경
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
        }

        // 로딩 시작
        setLoading(true);

        const authHeader = { Authorization: cookie.load("BM") };

        const getAndSetVideo = async () => {
            if (site && dates[selectedDateIndex]) {
                try {
                    const response = await API.getSiteDailyVideo(
                        authHeader,
                        site,
                        dates[selectedDateIndex],
                    );
                    setVideoURL(URL.createObjectURL(response.data));
                    // 로딩 완료
                    setLoading(false);
                } catch (err) {
                    console.error("Failed to get video:", err);
                }
            }
        };

        getAndSetVideo();
    }, [dates[selectedDateIndex]]);

    return (
        <>
            <hr />
            <div className="selector-container">
                <label>
                    <span className="input-range-label">영상</span>
                    <input
                        className="input-range-video"
                        name="video"
                        type="range"
                        min={0}
                        max={dates.length - 1}
                        value={tempDateIndex}
                        step={1}
                        onChange={handleDateChange}
                        list="videoTicks"
                    />
                    <datalist id="videoTicks">
                        {dates.map((_, index) => (
                            <option value={index} key={index} />
                        ))}
                    </datalist>
                    <span className="input-range-value">
                        {dates[tempDateIndex]
                            ?.split(".")[0]
                            .split("_")[1]
                            .replaceAll("-", "/")}
                    </span>
                </label>
            </div>
            <hr />
            <div className="video-container">
                {loading ? (
                    <div className="spinner"></div>
                ) : (
                    <video controls autoplay muted ref={videoRef}>
                        <source src={videoURL} type="video/mp4" />
                        Your browser does not support the video tag.
                    </video>
                )}
            </div>
            <hr />
        </>
    );
}

export default SelectedVideo;
