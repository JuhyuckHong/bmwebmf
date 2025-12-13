import { useState, useEffect, useRef, useCallback } from "react";
import { API } from "../../../API";
import Cookies from "js-cookie";

const DEBOUNCE_DELAY = 150; // Reduced from 500ms to 150ms

/**
 * Custom hook for photo data management
 */
export function usePhotoData(site) {
    const [dates, setDates] = useState([]);
    const [times, setTimes] = useState([]);
    const [selectedDateIndex, setSelectedDateIndex] = useState(0);
    const [tempDateIndex, setTempDateIndex] = useState(0);
    const [selectedTimeIndex, setSelectedTimeIndex] = useState(0);
    const [tempTimeIndex, setTempTimeIndex] = useState(0);
    const [mediaURL, setMediaURL] = useState("");
    const [loading, setLoading] = useState(false);

    const dateDebounceRef = useRef(null);
    const timeDebounceRef = useRef(null);

    // Fetch dates when site changes
    useEffect(() => {
        if (!site) return;

        const authHeader = { Authorization: Cookies.get("BM") };
        setDates([]);
        setTimes([]);
        setTempDateIndex(0);
        setMediaURL("");

        const fetchDates = async () => {
            try {
                setLoading(true);
                const response = await API.getSiteDate(authHeader, site);
                setDates(response.data);
                const lastIndex = response.data.length - 1;
                setTempDateIndex(lastIndex);
                setSelectedDateIndex(lastIndex);
            } catch (err) {
                console.error("Failed to get dates:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchDates();
    }, [site]);

    // Debounced date selection
    useEffect(() => {
        if (dateDebounceRef.current) {
            clearTimeout(dateDebounceRef.current);
        }

        dateDebounceRef.current = setTimeout(() => {
            setSelectedDateIndex(tempDateIndex);
        }, DEBOUNCE_DELAY);

        return () => {
            if (dateDebounceRef.current) {
                clearTimeout(dateDebounceRef.current);
            }
        };
    }, [tempDateIndex]);

    // Fetch times when date changes
    useEffect(() => {
        if (!site || !dates[selectedDateIndex]) return;

        const authHeader = { Authorization: Cookies.get("BM") };

        const fetchTimes = async () => {
            try {
                const response = await API.getSiteDateList(
                    authHeader,
                    site,
                    dates[selectedDateIndex]
                );
                setTimes(response.data);
                const lastIndex = response.data.length - 1;
                setTempTimeIndex(lastIndex);
                setSelectedTimeIndex(lastIndex);
            } catch (err) {
                console.error("Failed to get times:", err);
            }
        };

        fetchTimes();
    }, [site, dates, selectedDateIndex]);

    // Debounced time selection
    useEffect(() => {
        if (timeDebounceRef.current) {
            clearTimeout(timeDebounceRef.current);
        }

        timeDebounceRef.current = setTimeout(() => {
            setSelectedTimeIndex(tempTimeIndex);
        }, DEBOUNCE_DELAY);

        return () => {
            if (timeDebounceRef.current) {
                clearTimeout(timeDebounceRef.current);
            }
        };
    }, [tempTimeIndex]);

    // Fetch image when time changes
    useEffect(() => {
        const authHeader = { Authorization: Cookies.get("BM") };
        const selectedDate = dates[selectedDateIndex];
        const selectedTime = times[selectedTimeIndex];

        if (
            !site ||
            !selectedDate ||
            !selectedTime ||
            selectedDate !== selectedTime.split("_")[0]
        ) {
            return;
        }

        const fetchImage = async () => {
            try {
                setLoading(true);
                const response = await API.getImage(
                    authHeader,
                    site,
                    selectedDate,
                    selectedTime.split(".")[0]
                );
                setMediaURL(URL.createObjectURL(response.data));
            } catch (err) {
                console.error("Failed to get image:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchImage();
    }, [site, dates, times, selectedDateIndex, selectedTimeIndex]);

    // Handlers
    const handleDateChange = useCallback((value) => {
        setTempDateIndex(parseInt(value, 10));
    }, []);

    const handleTimeChange = useCallback((value) => {
        setTempTimeIndex(parseInt(value, 10));
    }, []);

    const handleDateNav = useCallback(
        (direction) => {
            setTempDateIndex((prev) => {
                const next = prev + direction;
                if (next >= 0 && next < dates.length) {
                    return next;
                }
                return prev;
            });
        },
        [dates.length]
    );

    const handleTimeNav = useCallback(
        (direction) => {
            setTempTimeIndex((prev) => {
                const next = prev + direction;
                if (next >= 0 && next < times.length) {
                    return next;
                }
                return prev;
            });
        },
        [times.length]
    );

    return {
        dates,
        times,
        selectedDateIndex: tempDateIndex,
        selectedTimeIndex: tempTimeIndex,
        mediaURL,
        loading,
        handleDateChange,
        handleTimeChange,
        handleDateNav,
        handleTimeNav,
    };
}

/**
 * Custom hook for video data management
 */
export function useVideoData(site) {
    const [dates, setDates] = useState([]);
    const [selectedDateIndex, setSelectedDateIndex] = useState(0);
    const [tempDateIndex, setTempDateIndex] = useState(0);
    const [mediaURL, setMediaURL] = useState("");
    const [loading, setLoading] = useState(false);
    const videoRef = useRef(null);

    const dateDebounceRef = useRef(null);

    // Fetch video dates when site changes
    useEffect(() => {
        if (!site) return;

        const authHeader = { Authorization: Cookies.get("BM") };
        setDates([]);
        setTempDateIndex(0);
        setMediaURL("");

        const fetchDates = async () => {
            try {
                setLoading(true);
                const response = await API.getSiteDailyVideoList(authHeader, site);
                const mp4Only = response.data.filter((f) => !f.includes("gif"));
                setDates(mp4Only);
                const lastIndex = mp4Only.length - 1;
                setTempDateIndex(lastIndex);
                setSelectedDateIndex(lastIndex);
            } catch (err) {
                console.error("Failed to get video dates:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchDates();
    }, [site]);

    // Debounced date selection
    useEffect(() => {
        if (dateDebounceRef.current) {
            clearTimeout(dateDebounceRef.current);
        }

        dateDebounceRef.current = setTimeout(() => {
            setSelectedDateIndex(tempDateIndex);
        }, DEBOUNCE_DELAY);

        return () => {
            if (dateDebounceRef.current) {
                clearTimeout(dateDebounceRef.current);
            }
        };
    }, [tempDateIndex]);

    // Fetch video when date changes
    useEffect(() => {
        if (!site || !dates[selectedDateIndex]) return;

        // Pause and reset video on date change
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
        }

        const authHeader = { Authorization: Cookies.get("BM") };

        const fetchVideo = async () => {
            try {
                setLoading(true);
                const response = await API.getSiteDailyVideo(
                    authHeader,
                    site,
                    dates[selectedDateIndex]
                );
                setMediaURL(URL.createObjectURL(response.data));
            } catch (err) {
                console.error("Failed to get video:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchVideo();
    }, [site, dates, selectedDateIndex]);

    // Handlers
    const handleDateChange = useCallback((value) => {
        setTempDateIndex(parseInt(value, 10));
    }, []);

    const handleDateNav = useCallback(
        (direction) => {
            setTempDateIndex((prev) => {
                const next = prev + direction;
                if (next >= 0 && next < dates.length) {
                    return next;
                }
                return prev;
            });
        },
        [dates.length]
    );

    return {
        dates,
        selectedDateIndex: tempDateIndex,
        mediaURL,
        loading,
        handleDateChange,
        handleDateNav,
        videoRef,
    };
}
