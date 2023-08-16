import { forwardRef } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

function DateSelector({
    inputDates,
    handleDateChangeFromCalendar,
    tempDateIndex,
}) {
    const dates = inputDates.map(
        (dateStr) =>
            new Date(dateStr.replace("daily_", "").replace(".mp4", "")),
    );

    // Convert Date object to "yyyy-MM-dd" format
    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0"); // month is 0-indexed
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    // When the date changes in the datepicker
    const handleDateChange = (date) => {
        const formattedDate = formatDate(date);
        handleDateChangeFromCalendar(formattedDate);
    };

    const CustomInput = forwardRef(({ value, onClick }, ref) => (
        <span className="input-range-value" onClick={onClick} ref={ref}>
            {value}
        </span>
    ));

    return (
        <DatePicker
            selected={dates[tempDateIndex]}
            onChange={handleDateChange}
            includeDates={dates}
            dateFormat="yyyy/MM/dd"
            placeholderText="Select"
            customInput={<CustomInput />}
        />
    );
}

export default DateSelector;
