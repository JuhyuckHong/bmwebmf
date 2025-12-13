import { useMemo } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { ko } from "date-fns/locale"; // Import Korean locale
import { getMonth, getYear, range } from "date-fns"; // Import getMonth, getYear, range
import "./TimelineSelector.css";

// Register Korean locale once
registerLocale("ko", ko);

/**
 * Helper to parse date string to Date object
 */
function parseDateString(dateStr) {
    if (!dateStr) return null;
    const match = dateStr.match(/(\d{4}-\d{2}-\d{2})/);
    if (match) {
        return new Date(match[1]);
    }
    return null;
}

/**
 * Parse time string into components
 */
function parseTimeComponents(timeStr) {
    if (!timeStr) return null;
    const match = timeStr.match(/_(\d{2})-(\d{2})-(\d{2})/);
    if (match) {
        return { h: match[1], m: match[2], s: match[3] };
    }
    return null;
}

const CustomDatePickerHeader = ({
    date,
    changeYear,
    changeMonth,
    decreaseMonth,
    increaseMonth,
    prevMonthButtonDisabled,
    nextMonthButtonDisabled,
    availableDates, // Receive availableDates
}) => {
    // Filter available years from availableDates
    const years = useMemo(() => {
        const uniqueYears = [...new Set(availableDates.map((d) => getYear(d)))].sort((a, b) => a - b);
        // Ensure current view year is included if not present (edge case)
        if (!uniqueYears.includes(getYear(date))) {
            uniqueYears.push(getYear(date));
            uniqueYears.sort((a, b) => a - b);
        }
        return uniqueYears;
    }, [availableDates, date]);

    // Filter available months for the currently viewed year
    const months = useMemo(() => {
        const currentYear = getYear(date);
        const uniqueMonths = [...new Set(
            availableDates
                .filter((d) => getYear(d) === currentYear)
                .map((d) => getMonth(d))
        )].sort((a, b) => a - b);
        
        // Ensure current view month is included
        if (!uniqueMonths.includes(getMonth(date))) {
            uniqueMonths.push(getMonth(date));
            uniqueMonths.sort((a, b) => a - b);
        }
        return uniqueMonths;
    }, [availableDates, date]);

    return (
        <div className="custom-datepicker-header">
            <button
                className="custom-nav-btn prev"
                onClick={decreaseMonth}
                disabled={prevMonthButtonDisabled}
            >
                {"<"}
            </button>
            
            {/* Dropdowns for selection (Default visible) */}
            <div className="month-year-selects header-dropdowns">
                <select
                    value={getYear(date)}
                    onChange={({ target: { value } }) => changeYear(parseInt(value, 10))}
                    className="custom-header-select"
                >
                    {years.map((option) => (
                        <option key={option} value={option}>{option}년</option>
                    ))}
                </select>
                <select
                    value={getMonth(date)}
                    onChange={({ target: { value } }) => changeMonth(parseInt(value, 10))}
                    className="custom-header-select"
                >
                    {months.map((option) => (
                        <option key={option} value={option}>{option + 1}월</option>
                    ))}
                </select>
            </div>

            {/* Text only display (For secondary months, default hidden via CSS) */}
            <div className="header-text">
                {getYear(date)}년 {getMonth(date) + 1}월
            </div>

            <button
                className="custom-nav-btn next"
                onClick={increaseMonth}
                disabled={nextMonthButtonDisabled}
            >
                {">"}
            </button>
        </div>
    );
};


function TimelineSelector({
    type, // "photo" | "video"
    dates = [],
    times = [],
    selectedDateIndex = 0,
    selectedTimeIndex = 0,
    onDateChange,
    onTimeChange,
    loading = false,
}) {
    const hasData = dates.length > 0;
    const hasTimes = type === "photo" && times.length > 0;

    // Convert string dates to Date objects for the picker
    const availableDates = useMemo(() => {
        return dates.map(parseDateString).filter(Boolean);
    }, [dates]);

    const selectedDate = useMemo(() => {
        if (!hasData || selectedDateIndex >= dates.length) return null;
        return parseDateString(dates[selectedDateIndex]);
    }, [dates, selectedDateIndex, hasData]);

    // Group times by Hour
    const timeStructure = useMemo(() => {
        const hours = {};
        times.forEach((t, index) => {
            const parts = parseTimeComponents(t);
            if (!parts) return;
            if (!hours[parts.h]) {
                hours[parts.h] = [];
            }
            hours[parts.h].push({
                m: parts.m,
                s: parts.s,
                index: index,
                label: `${parts.m}` // Removed seconds
            });
        });
        return hours;
    }, [times]);

    const availableHours = Object.keys(timeStructure).sort();
    
    // Derived current state
    const currentParts = hasTimes ? parseTimeComponents(times[selectedTimeIndex]) : null;
    const currentHour = currentParts ? currentParts.h : (availableHours[0] || "");
    const availableMinutes = timeStructure[currentHour] || [];

    const handleDateSelect = (date) => {
        if (!date) return;
        const index = availableDates.findIndex(
            (d) => d.getTime() === date.getTime()
        );
        if (index !== -1) {
            onDateChange(index);
        }
    };

    const handleHourChange = (e) => {
        const newHour = e.target.value;
        const minutes = timeStructure[newHour];
        if (minutes && minutes.length > 0) {
            // Select the first available minute in the new hour
            onTimeChange(minutes[0].index);
        }
    };

    const handleMinuteChange = (e) => {
        onTimeChange(parseInt(e.target.value, 10));
    };

    return (
        <div className={`timeline-selector ${loading ? "loading" : ""}`}>
            <div className="selector-layout">
                {/* Inline Calendar & Date Nav */}
                <div className="calendar-section">
                    <DatePicker
                        selected={selectedDate}
                        onChange={handleDateSelect}
                        includeDates={availableDates}
                        dateFormat="yyyy-MM-dd"
                        inline
                        disabled={!hasData}
                        monthsShown={type === "video" ? 2 : 1}
                        month={type === "video" && selectedDate ? new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1) : selectedDate}
                        locale="ko" // Apply Korean locale
                        renderCustomHeader={(props) => (
                            <CustomDatePickerHeader {...props} availableDates={availableDates} />
                        )}
                    />
                </div>

                {/* Controls Section (Time Selection for Photo) */}
                {type === "photo" && hasTimes && (
                    <div className="controls-section">
                        <div className="time-selection-group">
                            <div className="time-lists-container">
                                {/* Hour Grid */}
                                <div className="time-grid-wrapper">
                                    <span className="grid-label">시 (Hour)</span>
                                    <div className="time-grid">
                                        {availableHours.map((h) => (
                                            <button
                                                key={h}
                                                className={`time-grid-item ${h === currentHour ? "selected" : ""}`}
                                                onClick={() => {
                                                    const minutes = timeStructure[h];
                                                    if (minutes && minutes.length > 0) {
                                                        onTimeChange(minutes[0].index);
                                                    }
                                                }}
                                                type="button"
                                            >
                                                {h}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Minute Grid */}
                                <div className="time-grid-wrapper">
                                    <span className="grid-label">분 (Minute)</span>
                                    <div className="time-grid minutes">
                                        {availableMinutes.map((item) => (
                                            <button
                                                key={item.index}
                                                className={`time-grid-item ${item.index === selectedTimeIndex ? "selected" : ""}`}
                                                onClick={() => onTimeChange(item.index)}
                                                type="button"
                                            >
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Simple count summary */}
            <div className="selection-summary">
                {hasData ? (
                     <span className="summary-count">
                        📅 {selectedDateIndex + 1}/{dates.length}
                        {type === "photo" && hasTimes && ` 📸 ${selectedTimeIndex + 1}/${times.length}`}
                    </span>
                ) : (
                    <span className="summary-empty">데이터 없음</span>
                )}
            </div>
        </div>
    );
}

export default TimelineSelector;
