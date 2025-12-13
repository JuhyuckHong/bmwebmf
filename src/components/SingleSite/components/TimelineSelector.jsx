import { useMemo } from "react";
import "./TimelineSelector.css";

/**
 * Format date string (YYYY-MM-DD or daily_YYYY-MM-DD.mp4 format)
 */
function formatDate(dateStr) {
    if (!dateStr) return "";
    // Extract date from video format: daily_YYYY-MM-DD.mp4
    const match = dateStr.match(/(\d{4}-\d{2}-\d{2})/);
    if (match) {
        const [year, month, day] = match[1].split("-");
        return `${year}/${month}/${day}`;
    }
    return dateStr;
}

/**
 * Format time string (YYYY-MM-DD_HH-MM-SS.jpg format)
 */
function formatTime(timeStr) {
    if (!timeStr) return "";
    // Extract time from format: YYYY-MM-DD_HH-MM-SS.jpg
    const match = timeStr.match(/_(\d{2})-(\d{2})-(\d{2})/);
    if (match) {
        return `${match[1]}:${match[2]}:${match[3]}`;
    }
    return timeStr;
}

function TimelineSelector({
    type, // "photo" | "video"
    dates = [],
    times = [],
    selectedDateIndex = 0,
    selectedTimeIndex = 0,
    onDateChange,
    onTimeChange,
    onDateNav,
    onTimeNav,
    loading = false,
}) {
    const hasData = dates.length > 0;
    const hasTimes = type === "photo" && times.length > 0;

    // Calculate position percentage for scrubber
    const datePosition = useMemo(() => {
        if (dates.length <= 1) return 0;
        return (selectedDateIndex / (dates.length - 1)) * 100;
    }, [selectedDateIndex, dates.length]);

    const timePosition = useMemo(() => {
        if (times.length <= 1) return 0;
        return (selectedTimeIndex / (times.length - 1)) * 100;
    }, [selectedTimeIndex, times.length]);

    const handleDateSliderChange = (e) => {
        onDateChange(e.target.value);
    };

    const handleTimeSliderChange = (e) => {
        if (onTimeChange) {
            onTimeChange(e.target.value);
        }
    };

    return (
        <div className={`timeline-selector ${loading ? "loading" : ""}`}>
            {/* Date Track */}
            <div className="timeline-track">
                <label className="track-label" htmlFor={`date-track-${type}`}>
                    {type === "video" ? "영상" : "날짜"}
                </label>

                <div className="track-content">
                    <input
                        id={`date-track-${type}`}
                        type="range"
                        className="track-slider"
                        min={0}
                        max={Math.max(0, dates.length - 1)}
                        value={selectedDateIndex}
                        onChange={handleDateSliderChange}
                        disabled={!hasData}
                        aria-valuetext={formatDate(dates[selectedDateIndex])}
                    />

                    {/* Progress bar */}
                    <div
                        className="track-progress"
                        style={{ width: `${datePosition}%` }}
                        aria-hidden="true"
                    />

                    {/* Scrubber value display */}
                    {hasData && (
                        <div
                            className="scrubber-value"
                            style={{ left: `${datePosition}%` }}
                        >
                            {formatDate(dates[selectedDateIndex])}
                        </div>
                    )}
                </div>

                <div className="track-controls">
                    <button
                        className="nav-btn"
                        onClick={() => onDateNav(-1)}
                        disabled={!hasData || selectedDateIndex === 0}
                        aria-label="이전 날짜"
                    >
                        &#9664;
                    </button>
                    <button
                        className="nav-btn"
                        onClick={() => onDateNav(1)}
                        disabled={!hasData || selectedDateIndex === dates.length - 1}
                        aria-label="다음 날짜"
                    >
                        &#9654;
                    </button>
                </div>
            </div>

            {/* Time Track (photo only) */}
            {type === "photo" && (
                <div className="timeline-track time-track">
                    <label className="track-label" htmlFor={`time-track-${type}`}>
                        시간
                    </label>

                    <div className="track-content">
                        <input
                            id={`time-track-${type}`}
                            type="range"
                            className="track-slider"
                            min={0}
                            max={Math.max(0, times.length - 1)}
                            value={selectedTimeIndex}
                            onChange={handleTimeSliderChange}
                            disabled={!hasTimes}
                            aria-valuetext={formatTime(times[selectedTimeIndex])}
                        />

                        {/* Progress bar */}
                        <div
                            className="track-progress"
                            style={{ width: `${timePosition}%` }}
                            aria-hidden="true"
                        />

                        {/* Scrubber value display */}
                        {hasTimes && (
                            <div
                                className="scrubber-value"
                                style={{ left: `${timePosition}%` }}
                            >
                                {formatTime(times[selectedTimeIndex])}
                            </div>
                        )}
                    </div>

                    <div className="track-controls">
                        <button
                            className="nav-btn"
                            onClick={() => onTimeNav(-1)}
                            disabled={!hasTimes || selectedTimeIndex === 0}
                            aria-label="이전 시간"
                        >
                            &#9664;
                        </button>
                        <button
                            className="nav-btn"
                            onClick={() => onTimeNav(1)}
                            disabled={!hasTimes || selectedTimeIndex === times.length - 1}
                            aria-label="다음 시간"
                        >
                            &#9654;
                        </button>
                    </div>
                </div>
            )}

            {/* Selection Summary */}
            <div className="selection-summary">
                {hasData ? (
                    <>
                        <span className="summary-date">
                            {formatDate(dates[selectedDateIndex])}
                        </span>
                        {hasTimes && (
                            <span className="summary-time">
                                {formatTime(times[selectedTimeIndex])}
                            </span>
                        )}
                        <span className="summary-count">
                            ({selectedDateIndex + 1}/{dates.length})
                        </span>
                    </>
                ) : (
                    <span className="summary-empty">데이터 없음</span>
                )}
            </div>
        </div>
    );
}

export default TimelineSelector;
