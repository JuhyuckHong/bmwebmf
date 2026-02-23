import { useEffect, useMemo, useState } from "react";
import Cookies from "js-cookie";
import { API } from "../API";
import "../CSS/Logs.css";

const DEFAULT_TYPE = "all";
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 50;
const DEFAULT_DATE_SORT_ORDER = "desc";
const DEFAULT_TIME_SORT_ORDER = "desc";
const PAGE_SIZE_OPTIONS = [50, 100, 200, 500];
const LOG_PATTERNS = [
    /^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2}(?:[.,]\d{1,6})?)\s+\[?([A-Z]+)\]?\s*[:\-]?\s*(.*)$/,
    /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2}(?:[.,]\d{1,6})?)\s+([A-Z]+)\s*(.*)$/,
];

const normalizePythonLikeValue = (raw) =>
    raw
        .replace(/\bNone\b/g, "null")
        .replace(/\bTrue\b/g, "true")
        .replace(/\bFalse\b/g, "false")
        .replace(/'/g, '"');

const tryParseStructuredValue = (raw) => {
    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") return parsed;
    } catch (_) {
        // noop
    }

    try {
        const parsed = JSON.parse(normalizePythonLikeValue(raw));
        if (parsed && typeof parsed === "object") return parsed;
    } catch (_) {
        // noop
    }

    return null;
};

const findStructuredSegment = (message) => {
    const start = message.search(/[\[{]/);
    if (start < 0) return null;

    const stack = [];
    let inString = false;
    let quoteChar = "";
    let escaped = false;

    for (let index = start; index < message.length; index += 1) {
        const char = message[index];

        if (inString) {
            if (escaped) {
                escaped = false;
                continue;
            }

            if (char === "\\") {
                escaped = true;
                continue;
            }

            if (char === quoteChar) {
                inString = false;
                quoteChar = "";
            }

            continue;
        }

        if (char === '"' || char === "'") {
            inString = true;
            quoteChar = char;
            continue;
        }

        if (char === "{" || char === "[") {
            stack.push(char);
            continue;
        }

        if (char === "}" || char === "]") {
            if (!stack.length) return null;
            const open = stack[stack.length - 1];
            const isMatched =
                (open === "{" && char === "}") ||
                (open === "[" && char === "]");

            if (!isMatched) return null;
            stack.pop();

            if (stack.length === 0) {
                return {
                    start,
                    end: index,
                };
            }
        }
    }

    return null;
};

const parseMessage = (message) => {
    const segment = findStructuredSegment(message);
    if (!segment) {
        return {
            text: message,
            structured: null,
            trailingText: "",
        };
    }

    const rawStructured = message.slice(segment.start, segment.end + 1).trim();
    const parsedStructured = tryParseStructuredValue(rawStructured);

    if (!parsedStructured) {
        return {
            text: message,
            structured: null,
            trailingText: "",
        };
    }

    return {
        text: message.slice(0, segment.start).trimEnd(),
        structured: JSON.stringify(parsedStructured, null, 2),
        trailingText: message.slice(segment.end + 1).trimStart(),
    };
};

const parseLogLine = (line) => {
    for (const pattern of LOG_PATTERNS) {
        const match = line.match(pattern);
        if (!match) continue;

        const [, date, time, level, rawMessage] = match;
        const parsedMessage = parseMessage(rawMessage ?? "");

        return {
            date,
            time,
            level: (level || "UNKNOWN").toUpperCase(),
            ...parsedMessage,
            raw: line,
        };
    }

    return {
        date: "-",
        time: "-",
        level: "UNKNOWN",
        text: line,
        structured: null,
        trailingText: "",
        raw: line,
    };
};

const parseTimeValue = (time) => {
    if (!time || time === "-") return Number.NEGATIVE_INFINITY;
    const [main = "", fraction = ""] = time.replace(",", ".").split(".");
    const [hh = "0", mm = "0", ss = "0"] = main.split(":");
    const hour = Number(hh);
    const minute = Number(mm);
    const second = Number(ss);

    if (
        Number.isNaN(hour) ||
        Number.isNaN(minute) ||
        Number.isNaN(second)
    ) {
        return Number.NEGATIVE_INFINITY;
    }

    const millis = Number((fraction || "").slice(0, 3).padEnd(3, "0"));
    return (((hour * 60 + minute) * 60 + second) * 1000) + millis;
};

const parseDateValue = (date) => {
    if (!date || date === "-") return Number.NEGATIVE_INFINITY;
    const parsed = Date.parse(`${date}T00:00:00`);
    return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
};

const normalizeTimeInput = (value, isEnd) => {
    if (!value) return "";
    if (value.length === 5) {
        return `${value}:${isEnd ? "59" : "00"}`;
    }
    return value;
};

const toSingleLinePreview = (value) =>
    (value || "").replace(/\s+/g, " ").trim();

const stripEmptyListToken = (value) =>
    toSingleLinePreview((value || "").replace(/\[\s*\]/g, " "));

const extractInlineListItems = (value) => {
    if (!value || !value.includes("[") || !value.includes("]")) return [];
    const match = value.match(/\[([^\]]+)\]/);
    if (!match) return [];

    return match[1]
        .split(",")
        .map((item) => item.trim().replace(/^['"]|['"]$/g, ""))
        .filter(Boolean);
};

const collectArrayItems = (value, output) => {
    if (value === null || value === undefined) return;

    if (Array.isArray(value)) {
        value.forEach((item) => {
            if (
                typeof item === "string" ||
                typeof item === "number" ||
                typeof item === "boolean"
            ) {
                output.push(String(item));
                return;
            }

            if (item && typeof item === "object") {
                collectArrayItems(item, output);
            }
        });
        return;
    }

    if (typeof value === "object") {
        Object.values(value).forEach((next) => collectArrayItems(next, output));
    }
};

const getListBadgeItems = (line) => {
    const collected = [];

    if (line.structured) {
        try {
            const structuredValue = JSON.parse(line.structured);
            collectArrayItems(structuredValue, collected);
        } catch (_) {
            // noop
        }
    }

    if (collected.length === 0) {
        collected.push(...extractInlineListItems(line.text));
        collected.push(...extractInlineListItems(line.trailingText));
    }

    return collected;
};

const isEmptyStructuredArray = (structuredText) => {
    if (!structuredText) return false;
    try {
        const parsed = JSON.parse(structuredText);
        return Array.isArray(parsed) && parsed.length === 0;
    } catch (_) {
        return false;
    }
};

const buildPreviewText = (line, hasBadges) => {
    const chunks = [];

    const cleanedText = stripEmptyListToken(line.text);
    const cleanedTrailingText = stripEmptyListToken(line.trailingText);
    const emptyStructuredArray = isEmptyStructuredArray(line.structured);

    if (cleanedText) {
        chunks.push(cleanedText);
    }

    if (line.structured && !hasBadges && !emptyStructuredArray) {
        chunks.push(line.structured);
    }

    if (cleanedTrailingText) {
        chunks.push(cleanedTrailingText);
    }

    const merged = toSingleLinePreview(chunks.join(" "));
    if (merged) return merged;
    if (hasBadges) return "List values";
    return "[empty message]";
};

const getErrorMessage = (error) => {
    const status = error?.response?.status;

    if (status === 401) {
        return "Session expired or unauthorized. Please sign in again.";
    }

    if (status === 403) {
        return "You do not have permission to view server logs.";
    }

    if (status === 400) {
        return "Invalid request parameters.";
    }

    return "Failed to load logs. Please try again.";
};

function LogsPage() {
    const [type, setType] = useState(DEFAULT_TYPE);
    const [page, setPage] = useState(DEFAULT_PAGE);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
    const [dateSortOrder, setDateSortOrder] = useState(DEFAULT_DATE_SORT_ORDER);
    const [timeSortOrder, setTimeSortOrder] = useState(DEFAULT_TIME_SORT_ORDER);
    const [selectedDate, setSelectedDate] = useState("");
    const [timeFrom, setTimeFrom] = useState("");
    const [timeTo, setTimeTo] = useState("");
    const [expandedRows, setExpandedRows] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [result, setResult] = useState({
        type: DEFAULT_TYPE,
        page: DEFAULT_PAGE,
        pageSize: DEFAULT_PAGE_SIZE,
        total: 0,
        totalPages: 0,
        logs: [],
    });

    useEffect(() => {
        let cancelled = false;

        const fetchLogs = async () => {
            setIsLoading(true);
            setErrorMessage("");

            try {
                const headers = { Authorization: Cookies.get("BM") };
                let next;

                if (type === "all") {
                    const mergedSize = page * pageSize;
                    const fetchByType = async (logType) => {
                        try {
                            const res = await API.getLogs(headers, {
                                type: logType,
                                page: 1,
                                page_size: mergedSize,
                            });
                            return res?.data ?? {};
                        } catch (error) {
                            if (error?.response?.status === 400) {
                                return {
                                    type: logType,
                                    total: 0,
                                    total_pages: 0,
                                    logs: [],
                                };
                            }
                            throw error;
                        }
                    };

                    const [infoData, debugData] = await Promise.all([
                        fetchByType("info"),
                        fetchByType("debug"),
                    ]);

                    if (cancelled) return;

                    const infoLogs = Array.isArray(infoData.logs) ? infoData.logs : [];
                    const debugLogs = Array.isArray(debugData.logs)
                        ? debugData.logs
                        : [];
                    const total =
                        (Number(infoData.total) || 0) +
                        (Number(debugData.total) || 0);

                    next = {
                        type,
                        page,
                        pageSize,
                        total,
                        totalPages: Math.max(1, Math.ceil(total / pageSize)),
                        logs: [...infoLogs, ...debugLogs],
                    };
                } else {
                    const res = await API.getLogs(headers, {
                        type,
                        page,
                        page_size: pageSize,
                    });

                    if (cancelled) return;

                    const data = res?.data ?? {};
                    next = {
                        type: data.type ?? type,
                        page: Number(data.page) || page,
                        pageSize: Number(data.page_size) || pageSize,
                        total: Number(data.total) || 0,
                        totalPages: Number(data.total_pages) || 0,
                        logs: Array.isArray(data.logs) ? data.logs : [],
                    };
                }

                setResult(next);
                setExpandedRows({});

                if (next.page !== page) {
                    setPage(next.page);
                }

                if (next.pageSize !== pageSize) {
                    setPageSize(next.pageSize);
                }
            } catch (error) {
                if (cancelled) return;
                setErrorMessage(getErrorMessage(error));
                setResult((prev) => ({
                    ...prev,
                    logs: [],
                    total: 0,
                    totalPages: 0,
                }));
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        };

        fetchLogs();

        return () => {
            cancelled = true;
        };
    }, [type, page, pageSize]);

    const startLine = useMemo(() => {
        if (!result.total || result.logs.length === 0) return 0;
        return (result.page - 1) * result.pageSize + 1;
    }, [result.logs.length, result.page, result.pageSize, result.total]);

    const parsedLogs = useMemo(
        () => result.logs.map((line) => parseLogLine(line)),
        [result.logs],
    );

    const availableDates = useMemo(() => {
        const dateSet = new Set(
            parsedLogs
                .map((line) => line.date)
                .filter((date) => date && date !== "-"),
        );
        return [...dateSet].sort((left, right) => parseDateValue(left) - parseDateValue(right));
    }, [parsedLogs]);

    useEffect(() => {
        if (!selectedDate) return;
        if (availableDates.includes(selectedDate)) return;
        setSelectedDate("");
    }, [availableDates, selectedDate]);

    const filteredLogs = useMemo(() => {
        const fromValue = timeFrom
            ? parseTimeValue(normalizeTimeInput(timeFrom, false))
            : null;
        const toValue = timeTo
            ? parseTimeValue(normalizeTimeInput(timeTo, true))
            : null;

        return parsedLogs.filter((line) => {
            if (selectedDate && line.date !== selectedDate) return false;

            if (fromValue !== null || toValue !== null) {
                const current = parseTimeValue(line.time);
                if (!Number.isFinite(current)) return false;
                if (fromValue !== null && current < fromValue) return false;
                if (toValue !== null && current > toValue) return false;
            }

            return true;
        });
    }, [parsedLogs, selectedDate, timeFrom, timeTo]);

    const sortedLogs = useMemo(() => {
        const dateDirection = dateSortOrder === "asc" ? 1 : -1;
        const timeDirection = timeSortOrder === "asc" ? 1 : -1;
        const nextLogs = [...filteredLogs];

        nextLogs.sort((left, right) => {
            const dateDiff =
                (parseDateValue(left.date) - parseDateValue(right.date)) *
                dateDirection;
            if (dateDiff !== 0) return dateDiff;

            return (
                (parseTimeValue(left.time) - parseTimeValue(right.time)) *
                timeDirection
            );
        });

        return nextLogs;
    }, [dateSortOrder, filteredLogs, timeSortOrder]);

    const visibleLogs = useMemo(() => {
        if (type !== "all") return sortedLogs;
        const offset = (page - 1) * pageSize;
        return sortedLogs.slice(offset, offset + pageSize);
    }, [page, pageSize, sortedLogs, type]);

    const onChangeType = (event) => {
        setType(event.target.value);
        setPage(DEFAULT_PAGE);
    };

    const onChangePageSize = (event) => {
        setPageSize(Number(event.target.value));
        setPage(DEFAULT_PAGE);
    };

    const onPrevPage = () => {
        setPage((prev) => Math.max(1, prev - 1));
    };

    const onNextPage = () => {
        setPage((prev) => {
            if (!result.totalPages) return prev;
            return Math.min(result.totalPages, prev + 1);
        });
    };

    const toggleDateSortOrder = () => {
        setDateSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    };

    const toggleTimeSortOrder = () => {
        setTimeSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    };

    const toggleRowExpanded = (rowKey) => {
        setExpandedRows((prev) => ({
            ...prev,
            [rowKey]: !prev[rowKey],
        }));
    };

    return (
        <div className="logs-page">
            <div className="logs-card">
                <div className="logs-card-header">
                    <h2>Server Logs</h2>
                    <p>Browse logs by level with paginated results.</p>
                </div>

                <div className="logs-toolbar">
                    <label htmlFor="log-type">Level</label>
                    <select
                        id="log-type"
                        value={type}
                        onChange={onChangeType}
                        disabled={isLoading}>
                        <option value="all">all</option>
                        <option value="info">info</option>
                        <option value="debug">debug</option>
                    </select>

                    <label htmlFor="log-page-size">Rows</label>
                    <select
                        id="log-page-size"
                        value={pageSize}
                        onChange={onChangePageSize}
                        disabled={isLoading}>
                        {PAGE_SIZE_OPTIONS.map((size) => (
                            <option key={size} value={size}>
                                {size}
                            </option>
                        ))}
                    </select>

                    <label htmlFor="log-date">Date</label>
                    <input
                        id="log-date"
                        type="date"
                        list="log-date-options"
                        value={selectedDate}
                        min={availableDates[0] || ""}
                        max={availableDates[availableDates.length - 1] || ""}
                        onChange={(event) => setSelectedDate(event.target.value)}
                        disabled={isLoading || availableDates.length === 0}
                    />
                    <datalist id="log-date-options">
                        {availableDates.map((date) => (
                            <option key={date} value={date} />
                        ))}
                    </datalist>

                    <span className="logs-toolbar-inline-label">Time From</span>
                    <input
                        id="log-time-from"
                        type="time"
                        step="1"
                        value={timeFrom}
                        onChange={(event) => setTimeFrom(event.target.value)}
                        disabled={isLoading}
                    />
                    <span className="logs-toolbar-inline-to">to</span>
                    <input
                        id="log-time-to"
                        type="time"
                        step="1"
                        value={timeTo}
                        onChange={(event) => setTimeTo(event.target.value)}
                        disabled={isLoading}
                    />

                    <button
                        type="button"
                        className="log-sort-toggle"
                        onClick={toggleDateSortOrder}
                        disabled={isLoading}
                        aria-label={`Toggle date sort order. Current: ${dateSortOrder}`}>
                        <span>Date Sort</span>
                        <span>{dateSortOrder === "asc" ? "↑" : "↓"}</span>
                    </button>

                    <button
                        type="button"
                        className="log-sort-toggle"
                        onClick={toggleTimeSortOrder}
                        disabled={isLoading}
                        aria-label={`Toggle time sort order. Current: ${timeSortOrder}`}>
                        <span>Time Sort</span>
                        <span>{timeSortOrder === "asc" ? "↑" : "↓"}</span>
                    </button>
                </div>

                <div className="logs-meta">
                    <span>Total: {result.total.toLocaleString()}</span>
                    <span>Visible: {visibleLogs.length.toLocaleString()}</span>
                    <span>
                        Page: {result.page.toLocaleString()} /{" "}
                        {Math.max(1, result.totalPages).toLocaleString()}
                    </span>
                </div>

                {errorMessage && (
                    <div className="logs-error" role="alert">
                        {errorMessage}
                    </div>
                )}

                <div className="logs-list-wrap">
                    <div className="logs-list-header">
                        <span>#</span>
                        <span>DATE</span>
                        <span>TIME</span>
                        <span>LEVEL</span>
                        <span>MESSAGE</span>
                    </div>

                    {isLoading ? (
                        <div className="logs-empty">Loading logs...</div>
                    ) : visibleLogs.length === 0 ? (
                        <div className="logs-empty">No logs found for current filters.</div>
                    ) : (
                        <ol className="logs-list" start={startLine}>
                            {visibleLogs.map((line, index) => {
                                const rowKey = `${result.page}-${index}-${line.raw}`;
                                const isExpanded = Boolean(expandedRows[rowKey]);
                                const badgeItems = getListBadgeItems(line);
                                const previewText = buildPreviewText(
                                    line,
                                    badgeItems.length > 0,
                                );
                                const hasMessageDetail =
                                    Boolean(line.structured) ||
                                    Boolean(line.trailingText) ||
                                    (line.text || "").includes("\n") ||
                                    (line.text || "").length > 140;
                                const hasDetail =
                                    badgeItems.length > 0 || hasMessageDetail;
                                const showStructuredDetail =
                                    line.structured &&
                                    badgeItems.length === 0 &&
                                    !isEmptyStructuredArray(line.structured);

                                return (
                                    <li key={rowKey} className="log-line">
                                        <span className="log-line-number">
                                            {startLine + index}
                                        </span>
                                        <span className="log-date">{line.date}</span>
                                        <span className="log-time">{line.time}</span>
                                        <span
                                            className={`log-level ${line.level.toLowerCase()}`}>
                                            {line.level}
                                        </span>
                                        <div className="log-message-wrap">
                                            <div className="log-message-head">
                                                <div
                                                    className={`log-inline-content ${
                                                        isExpanded
                                                            ? "expanded"
                                                            : "collapsed"
                                                    }`}>
                                                    <span className="log-message-preview">
                                                        {previewText}
                                                    </span>
                                                    {badgeItems.map((item, badgeIndex) => (
                                                        <span
                                                            key={`${rowKey}-badge-${badgeIndex}`}
                                                            className="log-badge">
                                                            {item}
                                                        </span>
                                                    ))}
                                                </div>
                                                {hasDetail && (
                                                    <button
                                                        type="button"
                                                        className="log-expand-btn"
                                                        onClick={() =>
                                                            toggleRowExpanded(
                                                                rowKey,
                                                            )
                                                        }>
                                                        {isExpanded
                                                            ? "Collapse"
                                                            : "Expand"}
                                                    </button>
                                                )}
                                            </div>
                                            {isExpanded && badgeItems.length === 0 && (
                                                <div className="log-message-detail">
                                                    {line.text && (
                                                        <p className="log-message">
                                                            {line.text}
                                                        </p>
                                                    )}
                                                    {showStructuredDetail && (
                                                        <pre className="log-structured">
                                                            <code>{line.structured}</code>
                                                        </pre>
                                                    )}
                                                    {line.trailingText && (
                                                        <p className="log-message">
                                                            {line.trailingText}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ol>
                    )}
                </div>

                <div className="logs-pagination">
                    <button
                        type="button"
                        className="admin-btn ghost"
                        onClick={onPrevPage}
                        disabled={isLoading || page <= 1}>
                        Previous
                    </button>
                    <button
                        type="button"
                        className="admin-btn ghost"
                        onClick={onNextPage}
                        disabled={
                            isLoading ||
                            !result.totalPages ||
                            page >= result.totalPages
                        }>
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
}

export default LogsPage;
