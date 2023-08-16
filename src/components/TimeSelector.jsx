import { forwardRef } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

function TimeSelector({
    inputTimes,
    handleTimeChangeFromCalendar,
    tempPhotoIndex,
}) {
    const times = inputTimes.map(
        (dateStr) =>
            new Date(
                dateStr.split("_")[0] +
                    "T" +
                    dateStr
                        .split("_")[1]
                        .replace(".jpg", "")
                        .replaceAll("-", ":"),
            ),
    );

    // Convert Date object to "yyyy-MM-dd" format
    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0"); // month is 0-indexed
        const day = String(date.getDate()).padStart(2, "0");
        const hour = String(date.getHours()).padStart(2, "0");
        const minute = String(date.getMinutes()).padStart(2, "0");
        const second = String(date.getSeconds()).padStart(2, "0");
        return `${year}-${month}-${day}_${hour}-${minute}-${second}.jpg`;
    };

    // When the date changes in the datepicker
    const handleTimeChange = (date) => {
        const formattedDate = formatDate(date);
        handleTimeChangeFromCalendar(formattedDate);
    };

    const CustomInput = forwardRef(({ value, onClick }, ref) => (
        <span className="input-range-value" onClick={onClick} ref={ref}>
            {value}
        </span>
    ));

    return (
        <DatePicker
            onChange={handleTimeChange}
            showTimeSelect
            showTimeSelectOnly
            timeCaption="시간"
            selected={times[tempPhotoIndex]}
            timeIntervals={1}
            includeTimes={times}
            dateFormat="HH:mm:SS"
            timeFormat="HH:mm:SS"
            placeholderText="Select"
            customInput={<CustomInput />}
        />
    );
}

export default TimeSelector;
