import { useEffect, useMemo, useState } from "react";
import Cookies from "js-cookie";
import { API } from "../../API";
import V2Header from "./V2Header";
import { formatDateLabel, readStored, writeStored } from "./v2Utils";
import {
    PAGE_SIZE_OPTIONS,
    buildPreviewText,
    getListBadgeItems,
    isEmptyStructuredArray,
    normalizeTimeInput,
    parseDateValue,
    parseLogLine,
    parseTimeValue,
} from "../LogsPage";
import { useKeyboardNavigation } from "../../hooks/useKeyboardNavigation";
import "./v2.css";
import "./V2Logs.css";

const LEVELS = [
    { key: "all", label: "전체" },
    { key: "info", label: "info" },
    { key: "debug", label: "debug" },
];

const LEVEL_TONES = {
    ERROR: "red",
    CRITICAL: "red",
    WARNING: "orange",
    WARN: "orange",
    INFO: "green",
};

const SORT_OPTIONS = [
    { key: "desc", label: "최신순" },
    { key: "asc", label: "오래된순" },
];

const getErrorMessage = (error) => {
    const status = error?.response?.status;
    if (status === 401) return "세션이 만료되었거나 권한이 없습니다. 다시 로그인하세요.";
    if (status === 403) return "서버 로그를 볼 권한이 없습니다.";
    if (status === 400) return "요청 값이 올바르지 않습니다.";
    return "로그를 불러오지 못했습니다. 다시 시도하세요.";
};

const emptyResult = (type, page, pageSize) => ({ type, page, pageSize, total: 0, totalPages: 0, logs: [] });

const copyText = async (text) => {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        const area = document.createElement("textarea");
        area.value = text;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        let ok = false;
        try {
            ok = document.execCommand("copy");
        } catch {
            ok = false;
        }
        document.body.removeChild(area);
        return ok;
    }
};

export default function V2Logs({ admin, setAuth }) {
    const [type, setType] = useState("all");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(() => {
        const stored = Number(readStored("bm-v2-log-size", 50));
        return PAGE_SIZE_OPTIONS.includes(stored) ? stored : 50;
    });
    const [dateSortOrder, setDateSortOrder] = useState("desc");
    const [timeSortOrder, setTimeSortOrder] = useState("desc");
    const [selectedDate, setSelectedDate] = useState("");
    const [timeFrom, setTimeFrom] = useState("");
    const [timeTo, setTimeTo] = useState("");
    const [query, setQuery] = useState("");
    const [filterOpen, setFilterOpen] = useState(false);
    const [detail, setDetail] = useState(null);
    const [copied, setCopied] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [reloadKey, setReloadKey] = useState(0);
    const [result, setResult] = useState(() => emptyResult("all", 1, 50));

    useEffect(() => {
        let cancelled = false;

        const fetchLogs = async () => {
            setIsLoading(true);
            setErrorMessage("");

            try {
                const headers = { Authorization: Cookies.get("BM") };
                let next;

                if (type === "all") {
                    // info·debug를 각각 page*pageSize만큼 받아 합친 뒤 화면에서 잘라 쓴다 (기존 화면과 같은 방식)
                    const mergedSize = page * pageSize;
                    const fetchByType = async (logType) => {
                        try {
                            const res = await API.getLogs(headers, { type: logType, page: 1, page_size: mergedSize });
                            return res?.data ?? {};
                        } catch (error) {
                            if (error?.response?.status === 400) return { total: 0, logs: [] };
                            throw error;
                        }
                    };

                    const [infoData, debugData] = await Promise.all([fetchByType("info"), fetchByType("debug")]);
                    if (cancelled) return;

                    const infoLogs = Array.isArray(infoData.logs) ? infoData.logs : [];
                    const debugLogs = Array.isArray(debugData.logs) ? debugData.logs : [];
                    const total = (Number(infoData.total) || 0) + (Number(debugData.total) || 0);
                    next = {
                        type,
                        page,
                        pageSize,
                        total,
                        totalPages: Math.max(1, Math.ceil(total / pageSize)),
                        logs: [...infoLogs, ...debugLogs],
                    };
                } else {
                    const res = await API.getLogs(headers, { type, page, page_size: pageSize });
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
                if (next.page !== page) setPage(next.page);
                if (next.pageSize !== pageSize) setPageSize(next.pageSize);
            } catch (error) {
                if (cancelled) return;
                setErrorMessage(getErrorMessage(error));
                setResult((prev) => ({ ...prev, logs: [], total: 0, totalPages: 0 }));
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        fetchLogs();
        return () => {
            cancelled = true;
        };
    }, [type, page, pageSize, reloadKey]);

    const parsedLogs = useMemo(() => result.logs.map((line) => parseLogLine(line)), [result.logs]);

    const availableDates = useMemo(() => {
        const dateSet = new Set(parsedLogs.map((line) => line.date).filter((date) => date && date !== "-"));
        return [...dateSet].sort((a, b) => parseDateValue(b) - parseDateValue(a));
    }, [parsedLogs]);

    useEffect(() => {
        if (selectedDate && !availableDates.includes(selectedDate)) setSelectedDate("");
    }, [availableDates, selectedDate]);

    const sortedLogs = useMemo(() => {
        const fromValue = timeFrom ? parseTimeValue(normalizeTimeInput(timeFrom, false)) : null;
        const toValue = timeTo ? parseTimeValue(normalizeTimeInput(timeTo, true)) : null;
        const q = query.trim().toLowerCase();

        const list = parsedLogs.filter((line) => {
            if (selectedDate && line.date !== selectedDate) return false;
            if (fromValue !== null || toValue !== null) {
                const current = parseTimeValue(line.time);
                if (!Number.isFinite(current)) return false;
                if (fromValue !== null && current < fromValue) return false;
                if (toValue !== null && current > toValue) return false;
            }
            if (q && !line.raw.toLowerCase().includes(q)) return false;
            return true;
        });

        const dateDirection = dateSortOrder === "asc" ? 1 : -1;
        const timeDirection = timeSortOrder === "asc" ? 1 : -1;
        return list.sort((a, b) => {
            const dateDiff = (parseDateValue(a.date) - parseDateValue(b.date)) * dateDirection;
            if (dateDiff !== 0) return dateDiff;
            return (parseTimeValue(a.time) - parseTimeValue(b.time)) * timeDirection;
        });
    }, [parsedLogs, selectedDate, timeFrom, timeTo, query, dateSortOrder, timeSortOrder]);

    const visibleLogs = useMemo(() => {
        const list = type === "all" ? sortedLogs.slice((page - 1) * pageSize, page * pageSize) : sortedLogs;
        return list.map((line) => {
            const badges = getListBadgeItems(line);
            return {
                ...line,
                badges,
                preview: buildPreviewText(line, badges.length > 0),
                showStructured: Boolean(line.structured) && badges.length === 0 && !isEmptyStructuredArray(line.structured),
            };
        });
    }, [sortedLogs, type, page, pageSize]);

    const startLine = result.total && visibleLogs.length ? (result.page - 1) * result.pageSize + 1 : 0;
    const totalPages = Math.max(1, result.totalPages);
    const activeFilters = [selectedDate, timeFrom, timeTo].filter(Boolean).length
        + (pageSize !== 50 ? 1 : 0)
        + (dateSortOrder !== "desc" || timeSortOrder !== "desc" ? 1 : 0);

    const changeType = (key) => {
        setType(key);
        setPage(1);
    };

    const changePageSize = (value) => {
        setPageSize(value);
        setPage(1);
        writeStored("bm-v2-log-size", String(value));
    };

    const prevPage = () => setPage((p) => Math.max(1, p - 1));
    const nextPage = () => setPage((p) => (result.totalPages ? Math.min(result.totalPages, p + 1) : p));
    const toggleDateSort = () => setDateSortOrder((v) => (v === "asc" ? "desc" : "asc"));
    const toggleTimeSort = () => setTimeSortOrder((v) => (v === "asc" ? "desc" : "asc"));

    const resetFilters = () => {
        setSelectedDate("");
        setTimeFrom("");
        setTimeTo("");
        setDateSortOrder("desc");
        setTimeSortOrder("desc");
        changePageSize(50);
    };

    useEffect(() => {
        window.scrollTo?.(0, 0);
    }, [page]);

    useEffect(() => {
        if (!copied) return undefined;
        const timer = setTimeout(() => setCopied(""), 1500);
        return () => clearTimeout(timer);
    }, [copied]);

    const sheetOpen = filterOpen || Boolean(detail);
    useKeyboardNavigation({
        ArrowLeft: () => prevPage(),
        ArrowRight: () => nextPage(),
        d: () => toggleDateSort(),
        D: () => toggleDateSort(),
        t: () => toggleTimeSort(),
        T: () => toggleTimeSort(),
    }, { enabled: !isLoading && !sheetOpen });

    useKeyboardNavigation({
        Escape: () => {
            setFilterOpen(false);
            setDetail(null);
        },
    }, { enabled: sheetOpen, allowInInputs: true });

    const onCopy = async (key, text) => {
        const ok = await copyText(text);
        setCopied(ok ? key : "fail");
    };

    const copyLabel = (key, label) => {
        if (copied === key) return "복사됨";
        if (copied === "fail") return "복사 실패";
        return label;
    };

    return (
        <div className="v2">
            <V2Header
                title="로그"
                subtitle={`총 ${result.total.toLocaleString()}줄`}
                admin={admin}
                setAuth={setAuth}
                legacyPath="/logs"
            >
                <div className="v2-toolbar">
                    <div className="v2-log-searchrow">
                        <input
                            className="v2-search"
                            type="search"
                            inputMode="search"
                            placeholder="현재 페이지에서 검색"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                        <button
                            type="button"
                            className={`v2-log-filter-btn ${activeFilters ? "active" : ""}`}
                            onClick={() => setFilterOpen(true)}
                        >
                            필터{activeFilters ? ` ${activeFilters}` : ""}
                        </button>
                    </div>
                    <div className="v2-chips" role="group" aria-label="레벨">
                        {LEVELS.map((l) => (
                            <button
                                key={l.key}
                                type="button"
                                className={type === l.key ? "active" : ""}
                                onClick={() => changeType(l.key)}
                                disabled={isLoading && type !== l.key}
                            >
                                {l.label}
                            </button>
                        ))}
                    </div>
                </div>
            </V2Header>

            <main className="v2-content narrow">
                <div className="v2-log-meta">
                    <span>표시 {visibleLogs.length.toLocaleString()}줄</span>
                    <span>{result.page.toLocaleString()} / {totalPages.toLocaleString()} 페이지</span>
                    {selectedDate && <span>{formatDateLabel(selectedDate)}</span>}
                    {(timeFrom || timeTo) && <span>{timeFrom || "처음"}~{timeTo || "끝"}</span>}
                </div>

                {errorMessage && (
                    <div className="v2-log-error" role="alert">
                        <span>{errorMessage}</span>
                        <button type="button" className="v2-btn" onClick={() => setReloadKey((k) => k + 1)}>
                            다시 시도
                        </button>
                    </div>
                )}

                {isLoading ? (
                    <p className="v2-empty">로그를 불러오는 중...</p>
                ) : visibleLogs.length === 0 ? (
                    !errorMessage && <p className="v2-empty">조건에 맞는 로그가 없습니다.</p>
                ) : (
                    <ol className="v2-log-list">
                        {visibleLogs.map((line, index) => {
                            const tone = LEVEL_TONES[line.level] ?? "gray";
                            const number = startLine + index;
                            return (
                                <li key={`${result.page}-${index}-${line.raw}`}>
                                    <button
                                        type="button"
                                        className={`v2-log-row ${tone}`}
                                        onClick={() => setDetail({ ...line, number })}
                                    >
                                        <span className="v2-log-row-head">
                                            <span className={`v2-log-level ${tone}`}>{line.level}</span>
                                            <span className="v2-log-when">
                                                {line.date !== "-" ? `${line.date} ${line.time}` : "시각 없음"}
                                            </span>
                                            {number > 0 && <span className="v2-log-num">#{number}</span>}
                                        </span>
                                        <span className="v2-log-preview">{line.preview}</span>
                                        {line.badges.length > 0 && (
                                            <span className="v2-log-badges">
                                                {line.badges.slice(0, 6).map((item, i) => (
                                                    <span key={i} className="v2-log-badge">{item}</span>
                                                ))}
                                                {line.badges.length > 6 && (
                                                    <span className="v2-log-badge more">+{line.badges.length - 6}</span>
                                                )}
                                            </span>
                                        )}
                                    </button>
                                </li>
                            );
                        })}
                    </ol>
                )}

                <nav className="v2-log-pager" aria-label="페이지">
                    <button type="button" className="v2-btn" onClick={prevPage} disabled={isLoading || page <= 1}>
                        ‹ 이전
                    </button>
                    <span className="v2-log-pager-label">{page} / {totalPages}</span>
                    <button
                        type="button"
                        className="v2-btn"
                        onClick={nextPage}
                        disabled={isLoading || !result.totalPages || page >= result.totalPages}
                    >
                        다음 ›
                    </button>
                </nav>
            </main>

            {filterOpen && (
                <div className="v2-sheet-overlay" onClick={() => setFilterOpen(false)}>
                    <div className="v2-sheet v2-log-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="필터">
                        <div className="v2-sheet-handle" aria-hidden="true" />
                        <h2 className="v2-log-sheet-title">필터</h2>

                        <label className="v2-log-field">
                            <span>날짜 (현재 페이지에 있는 날짜)</span>
                            <select
                                className="v2-select v2-log-input"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                disabled={availableDates.length === 0}
                            >
                                <option value="">전체 날짜</option>
                                {availableDates.map((date) => (
                                    <option key={date} value={date}>{`${formatDateLabel(date)} · ${date}`}</option>
                                ))}
                            </select>
                        </label>

                        <div className="v2-log-field">
                            <span>시간 범위</span>
                            <div className="v2-log-timerow">
                                <input
                                    className="v2-log-input"
                                    type="time"
                                    step="1"
                                    aria-label="시작 시각"
                                    value={timeFrom}
                                    onChange={(e) => setTimeFrom(e.target.value)}
                                />
                                <span aria-hidden="true">~</span>
                                <input
                                    className="v2-log-input"
                                    type="time"
                                    step="1"
                                    aria-label="끝 시각"
                                    value={timeTo}
                                    onChange={(e) => setTimeTo(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="v2-log-field">
                            <span>날짜 정렬</span>
                            <div className="v2-segment v2-log-segment" role="group" aria-label="날짜 정렬">
                                {SORT_OPTIONS.map((s) => (
                                    <button key={s.key} type="button" className={dateSortOrder === s.key ? "active" : ""}
                                        onClick={() => setDateSortOrder(s.key)}>{s.label}</button>
                                ))}
                            </div>
                        </div>

                        <div className="v2-log-field">
                            <span>시간 정렬 (같은 날짜 안에서)</span>
                            <div className="v2-segment v2-log-segment" role="group" aria-label="시간 정렬">
                                {SORT_OPTIONS.map((s) => (
                                    <button key={s.key} type="button" className={timeSortOrder === s.key ? "active" : ""}
                                        onClick={() => setTimeSortOrder(s.key)}>{s.label}</button>
                                ))}
                            </div>
                        </div>

                        <div className="v2-log-field">
                            <span>페이지당 줄 수</span>
                            <div className="v2-segment v2-log-segment" role="group" aria-label="페이지당 줄 수">
                                {PAGE_SIZE_OPTIONS.map((size) => (
                                    <button key={size} type="button" className={pageSize === size ? "active" : ""}
                                        onClick={() => changePageSize(size)}>{size}</button>
                                ))}
                            </div>
                        </div>

                        <div className="v2-actions v2-log-sheet-actions">
                            <button type="button" className="v2-btn" onClick={resetFilters}>초기화</button>
                            <button type="button" className="v2-btn v2-log-primary" onClick={() => setFilterOpen(false)}>
                                적용
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {detail && (
                <div className="v2-sheet-overlay" onClick={() => setDetail(null)}>
                    <div className="v2-sheet v2-log-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="로그 상세">
                        <div className="v2-sheet-handle" aria-hidden="true" />
                        <div className="v2-log-row-head">
                            <span className={`v2-log-level ${LEVEL_TONES[detail.level] ?? "gray"}`}>{detail.level}</span>
                            <span className="v2-log-when">
                                {detail.date !== "-" ? `${detail.date} ${detail.time}` : "시각 없음"}
                            </span>
                            {detail.number > 0 && <span className="v2-log-num">#{detail.number}</span>}
                        </div>

                        {detail.text && <p className="v2-log-detail-text">{detail.text}</p>}
                        {detail.badges.length > 0 && (
                            <div className="v2-log-badges">
                                {detail.badges.map((item, i) => (
                                    <span key={i} className="v2-log-badge">{item}</span>
                                ))}
                            </div>
                        )}
                        {detail.showStructured && (
                            <div className="v2-log-block">
                                <div className="v2-log-block-head">
                                    <span>구조화 데이터</span>
                                    <button type="button" className="v2-log-copy" onClick={() => onCopy("structured", detail.structured)}>
                                        {copyLabel("structured", "복사")}
                                    </button>
                                </div>
                                <pre className="v2-log-pre">{detail.structured}</pre>
                            </div>
                        )}
                        {detail.trailingText && <p className="v2-log-detail-text">{detail.trailingText}</p>}

                        <div className="v2-log-block">
                            <div className="v2-log-block-head">
                                <span>원문</span>
                                <button type="button" className="v2-log-copy" onClick={() => onCopy("raw", detail.raw)}>
                                    {copyLabel("raw", "복사")}
                                </button>
                            </div>
                            <pre className="v2-log-pre">{detail.raw}</pre>
                        </div>

                        <button type="button" className="v2-menu-close" onClick={() => setDetail(null)}>
                            닫기
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
