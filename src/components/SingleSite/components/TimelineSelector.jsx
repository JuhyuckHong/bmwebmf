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
    availableDates,
    customHeaderCount,
    isVideoMode,
}) => {
    // In video mode: index 0 = previous month, index 1 = current month
    const isPrevMonth = isVideoMode && customHeaderCount === 0;
    const isCurrentMonth = isVideoMode && customHeaderCount === 1;
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
                style={isCurrentMonth ? { visibility: 'hidden' } : undefined}
            >
                {"<"}
            </button>

            <div
                className="month-year-selects header-dropdowns"
                style={isPrevMonth ? { visibility: 'hidden' } : undefined}
            >
                <span className="header-label">날짜</span>
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

            <button
                className="custom-nav-btn next"
                onClick={increaseMonth}
                disabled={nextMonthButtonDisabled}
                style={isPrevMonth ? { visibility: 'hidden' } : undefined}
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
                <div className={`calendar-section ${type === "video" ? "video-mode" : ""}`}>
                    <DatePicker
                        selected={selectedDate}
                        onChange={handleDateSelect}
                        includeDates={availableDates}
                        dateFormat="yyyy-MM-dd"
                        inline
                        disabled={!hasData}
                        monthsShown={type === "video" ? 2 : 1}
                        showPreviousMonths={type === "video"}
                        fixedHeight
                        locale="ko"
                        renderCustomHeader={(props) => (
                            <CustomDatePickerHeader {...props} availableDates={availableDates} isVideoMode={type === "video"} />
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
                                    <span className="grid-label">
                                        {selectedDate
                                            ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')} 일자의 시각 선택`
                                            : '시각 선택'}
                                    </span>
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
                                    <span className="grid-label">
                                        {currentHour ? `${currentHour}시의 분 선택` : '분 선택'}
                                    </span>
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
        </div>
    );
}

export default TimelineSelector;