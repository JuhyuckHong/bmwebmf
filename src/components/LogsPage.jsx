import { useEffect, useMemo, useState } from "react";
import Cookies from "js-cookie";
import { API } from "../API";
import "../CSS/Logs.css";

const DEFAULT_TYPE = "info";
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 50;
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
    const start = message.search(/[{\[]/);
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

const getErrorMessage = (error) => {
    const status = error?.response?.status;

    if (status === 401) {
        return "인증이 만료되었거나 유효하지 않습니다. 다시 로그인 해주세요.";
    }

    if (status === 403) {
        return "관리자 권한이 없습니다.";
    }

    if (status === 400) {
        return "요청 파라미터가 올바르지 않습니다.";
    }

    return "로그를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.";
};

function LogsPage() {
    const [type, setType] = useState(DEFAULT_TYPE);
    const [page, setPage] = useState(DEFAULT_PAGE);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
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
                const res = await API.getLogs(
                    { Authorization: Cookies.get("BM") },
                    { type, page, page_size: pageSize },
                );

                if (cancelled) return;

                const data = res?.data ?? {};
                const next = {
                    type: data.type ?? type,
                    page: Number(data.page) || page,
                    pageSize: Number(data.page_size) || pageSize,
                    total: Number(data.total) || 0,
                    totalPages: Number(data.total_pages) || 0,
                    logs: Array.isArray(data.logs) ? data.logs : [],
                };

                setResult(next);

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

    const endLine = useMemo(() => {
        if (!result.total || result.logs.length === 0) return 0;
        return Math.min(result.page * result.pageSize, result.total);
    }, [result.page, result.pageSize, result.total, result.logs.length]);

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

    return (
        <div className="logs-page">
            <div className="logs-card">
                <div className="logs-card-header">
                    <h2>백엔드 서버 로그</h2>
                    <p>
                        로그 타입별로 최신 로그를 페이지 단위로 조회합니다.
                    </p>
                </div>

                <div className="logs-toolbar">
                    <label htmlFor="log-type">타입</label>
                    <select
                        id="log-type"
                        value={type}
                        onChange={onChangeType}
                        disabled={isLoading}>
                        <option value="info">info</option>
                        <option value="debug">debug</option>
                    </select>

                    <label htmlFor="log-page-size">페이지 크기</label>
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
                </div>

                <div className="logs-meta">
                    <span>
                        전체 {result.total.toLocaleString()}줄
                    </span>
                    <span>
                        현재 {startLine.toLocaleString()}-
                        {endLine.toLocaleString()}줄
                    </span>
                    <span>
                        페이지 {result.page.toLocaleString()} /{" "}
                        {Math.max(1, result.totalPages).toLocaleString()}
                    </span>
                </div>

                {errorMessage && (
                    <div className="logs-error" role="alert">
                        {errorMessage}
                    </div>
                )}

                <div className="logs-list-wrap">
                    {isLoading ? (
                        <div className="logs-empty">로그를 불러오는 중입니다...</div>
                    ) : parsedLogs.length === 0 ? (
                        <div className="logs-empty">표시할 로그가 없습니다.</div>
                    ) : (
                        <ol className="logs-list" start={startLine}>
                            {parsedLogs.map((line, index) => (
                                <li
                                    key={`${result.page}-${index}-${line.raw.slice(0, 24)}`}
                                    className="log-line">
                                    <div className="log-meta-row">
                                        <span className="log-date">{line.date}</span>
                                        <span className="log-time">{line.time}</span>
                                        <span
                                            className={`log-level ${line.level.toLowerCase()}`}>
                                            {line.level}
                                        </span>
                                    </div>
                                    {line.text && (
                                        <p className="log-message">{line.text}</p>
                                    )}
                                    {line.structured && (
                                        <pre className="log-structured">
                                            <code>{line.structured}</code>
                                        </pre>
                                    )}
                                    {line.trailingText && (
                                        <p className="log-message">
                                            {line.trailingText}
                                        </p>
                                    )}
                                </li>
                            ))}
                        </ol>
                    )}
                </div>

                <div className="logs-pagination">
                    <button
                        type="button"
                        className="admin-btn ghost"
                        onClick={onPrevPage}
                        disabled={isLoading || page <= 1}>
                        이전
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
                        다음
                    </button>
                </div>
            </div>
        </div>
    );
}

export default LogsPage;
