const HISTORY_COLLECTION_KEYS = [
    "metrics",
    "hardware_events",
    "config_events",
    "update_events",
];

function toLocalStartOfDay(dateText) {
    return new Date(`${dateText}T00:00:00.000`);
}

function toLocalEndOfDay(dateText) {
    return new Date(`${dateText}T23:59:59.999`);
}

function isWithinRange(timestamp, startMs, endMs) {
    const value = new Date(timestamp).getTime();
    return Number.isFinite(value) && value >= startMs && value <= endMs;
}

export function hasValidDateRange(startDate, endDate) {
    return Boolean(startDate && endDate && startDate <= endDate);
}

export function formatRangeLabel(startDate, endDate) {
    if (!hasValidDateRange(startDate, endDate)) return "";
    return `${startDate.replaceAll("-", ".")} ~ ${endDate.replaceAll("-", ".")}`;
}

export function filterHistoryDataByDateRange(source, startDate, endDate) {
    if (!hasValidDateRange(startDate, endDate)) return source ?? null;

    const startMs = toLocalStartOfDay(startDate).getTime();
    const endMs = toLocalEndOfDay(endDate).getTime();
    const base = source ?? {};

    return HISTORY_COLLECTION_KEYS.reduce((acc, key) => {
        const items = Array.isArray(base[key]) ? base[key] : [];
        acc[key] = items.filter((item) => isWithinRange(item?.ts, startMs, endMs));
        return acc;
    }, { ...base });
}
