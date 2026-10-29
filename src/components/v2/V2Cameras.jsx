import { useCallback, useEffect, useMemo, useState } from "react";
import Cookies from "js-cookie";
import { API } from "../../API";
import V2Header from "./V2Header";
import { SORTS, daysSince, formatCount, formatDate, trimModuleId } from "../CameraPage";
import { readStored, writeStored } from "./v2Utils";
import "./v2.css";
import "./V2Cameras.css";

const SORT_OPTIONS = [
    { key: "shutter", label: "셔터 횟수순" },
    { key: "rate", label: "하루 평균순" },
    { key: "module", label: "모듈순" },
    { key: "model", label: "기종순" },
    { key: "lastSeen", label: "마지막 확인순" },
];

const RECENT_COUNT = 10;

const formatRate = (value) => (value == null ? "-" : formatCount(Math.round(value)));

const isStale = (value) => {
    const days = daysSince(value);
    return days != null && days > 7;
};

function V2CameraSheet({ camera, onClose }) {
    const [readings, setReadings] = useState(null);
    const [showAll, setShowAll] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const headers = { Authorization: Cookies.get("BM") };
        API.getCameraHistory(headers, camera.camera_id, 0)
            .then((res) => {
                if (!cancelled) setReadings(res.data?.readings || []);
            })
            .catch(() => {
                if (!cancelled) setReadings([]);
            });
        return () => { cancelled = true; };
    }, [camera.camera_id]);

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    const ordered = readings ? [...readings].reverse() : [];
    const shown = showAll ? ordered : ordered.slice(0, RECENT_COUNT);
    const modules = camera.modules || [];

    return (
        <div className="v2-sheet-overlay" onClick={onClose}>
            <div className="v2-sheet v2-cam-sheet" onClick={(e) => e.stopPropagation()} role="dialog"
                aria-label={`카메라 ${camera.camera_serial || camera.camera_id}`}>
                <div className="v2-sheet-handle" aria-hidden="true" />
                <div className="v2-cam-sheet-title">
                    <strong>{camera.camera_model || "기종 정보 없음"}</strong>
                    <span className="v2-muted">모듈 {trimModuleId(camera.current_module_id) || "-"}</span>
                </div>

                <dl className="v2-cam-fields">
                    <div><dt>시리얼</dt><dd className="v2-cam-serial">{camera.camera_serial || "-"}</dd></div>
                    <div><dt>셔터 횟수</dt><dd className="v2-cam-num">{formatCount(camera.shutter_count)}</dd></div>
                    <div><dt>하루 평균</dt><dd className="v2-cam-num">{formatRate(camera.shots_per_day)}</dd></div>
                    <div><dt>셔터 확인</dt><dd>{formatDate(camera.shutter_count_at)}</dd></div>
                    <div>
                        <dt>마지막 확인</dt>
                        <dd className={isStale(camera.last_seen) ? "v2-cam-stale" : undefined}>
                            {formatDate(camera.last_seen)}
                        </dd>
                    </div>
                </dl>

                <section className="v2-cam-section">
                    <h3>장착 이력</h3>
                    {modules.length === 0 ? (
                        <p className="v2-muted v2-cam-none">기록 없음</p>
                    ) : (
                        <ul className="v2-cam-list">
                            {modules.map((place) => (
                                <li key={place.module_id}>
                                    <strong>모듈 {trimModuleId(place.module_id)}</strong>
                                    <span className="v2-muted">
                                        {formatDate(place.first_seen)} ~ {formatDate(place.last_seen)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <section className="v2-cam-section">
                    <h3>
                        셔터 횟수 기록
                        <span className="v2-muted">
                            {showAll ? ` 전체 ${ordered.length}건` : ` 최근 ${RECENT_COUNT}건`}
                        </span>
                    </h3>
                    {readings === null && <p className="v2-muted v2-cam-none">불러오는 중...</p>}
                    {readings !== null && ordered.length === 0 && <p className="v2-muted v2-cam-none">기록 없음</p>}
                    {shown.length > 0 && (
                        <ul className="v2-cam-list">
                            {shown.map((reading) => (
                                <li key={`${reading.collected_at}-${reading.module_id}`}>
                                    <span className="v2-cam-reading-top">
                                        <span>{formatDate(reading.collected_at)}</span>
                                        <strong className="v2-cam-num">{formatCount(reading.shutter_count)}</strong>
                                    </span>
                                    <span className="v2-muted v2-cam-reading-sub">
                                        모듈 {trimModuleId(reading.module_id) || "-"} · {reading.photo_file || "-"}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                    {ordered.length > RECENT_COUNT && (
                        <button type="button" className="v2-btn v2-cam-more" onClick={() => setShowAll((v) => !v)}>
                            {showAll ? `최근 ${RECENT_COUNT}건만 보기` : `전체 ${ordered.length}건 보기`}
                        </button>
                    )}
                </section>

                <button type="button" className="v2-menu-close" onClick={onClose}>닫기</button>
            </div>
        </div>
    );
}

export default function V2Cameras({ admin, setAuth }) {
    const [cameras, setCameras] = useState([]);
    const [backfill, setBackfill] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [query, setQuery] = useState("");
    const [model, setModel] = useState("all");
    const [sortKey, setSortKey] = useState(() => {
        const saved = readStored("bm-v2-cam-sort", "shutter");
        return SORTS[saved] ? saved : "shutter";
    });
    const [selectedId, setSelectedId] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const headers = { Authorization: Cookies.get("BM") };
            const res = await API.getCameras(headers);
            setCameras(res.data?.cameras || []);
            setBackfill(res.data?.backfill || null);
        } catch (err) {
            console.error("camera list error", err);
            setError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const models = useMemo(
        () => [...new Set(cameras.map((cam) => cam.camera_model).filter(Boolean))].sort(),
        [cameras],
    );

    const modelCounts = useMemo(() => {
        const counts = {};
        cameras.forEach((cam) => {
            if (cam.camera_model) counts[cam.camera_model] = (counts[cam.camera_model] || 0) + 1;
        });
        return counts;
    }, [cameras]);

    const visible = useMemo(() => {
        const needle = query.trim().toLowerCase();
        return cameras
            .filter((cam) => model === "all" || cam.camera_model === model)
            .filter((cam) => {
                if (!needle) return true;
                return [cam.camera_id, cam.camera_model, cam.current_module_id && trimModuleId(cam.current_module_id)]
                    .filter(Boolean)
                    .some((value) => String(value).toLowerCase().includes(needle));
            })
            .sort(SORTS[sortKey]);
    }, [cameras, query, model, sortKey]);

    const withShutter = cameras.filter((cam) => cam.shutter_count != null).length;
    const backfillActive = backfill && backfill.total > 0 && backfill.pending + backfill.error > 0;
    const backfillDone = backfillActive ? backfill.total - backfill.pending : 0;
    const selected = selectedId == null ? null : cameras.find((cam) => cam.camera_id === selectedId);
    const closeSheet = useCallback(() => setSelectedId(null), []);

    const changeSort = (key) => {
        setSortKey(key);
        writeStored("bm-v2-cam-sort", key);
    };

    return (
        <div className="v2">
            <V2Header
                title="카메라 정보"
                subtitle={`${cameras.length}대 · 셔터 확인 ${withShutter}대`}
                admin={admin}
                setAuth={setAuth}
                legacyPath="/cameras"
            >
                <div className="v2-toolbar">
                    <div className="v2-cam-search-row">
                        <input
                            className="v2-search"
                            type="search"
                            inputMode="search"
                            placeholder="모듈 / 기종 / 시리얼 검색"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                        <button type="button" className="v2-btn v2-cam-refresh" onClick={load} disabled={loading}
                            aria-label="새로고침">
                            새로고침
                        </button>
                    </div>
                    <div className="v2-cam-selects">
                        <select className="v2-select" value={model} onChange={(e) => setModel(e.target.value)}
                            aria-label="기종">
                            <option value="all">전체 기종 ({cameras.length})</option>
                            {models.map((name) => (
                                <option key={name} value={name}>{name} ({modelCounts[name]})</option>
                            ))}
                        </select>
                        <select className="v2-select" value={sortKey} onChange={(e) => changeSort(e.target.value)}
                            aria-label="정렬">
                            {SORT_OPTIONS.map((s) => (
                                <option key={s.key} value={s.key}>{s.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </V2Header>

            <main className="v2-content">
                {backfillActive && (
                    <div className="v2-cam-backfill" role="status">
                        <span>
                            과거 기록 수집 중 {backfillDone}/{backfill.total}
                            {backfill.error > 0 && <span className="v2-cam-stale"> · 오류 {backfill.error}</span>}
                        </span>
                        <span className="v2-cam-progress" aria-hidden="true">
                            <span style={{ width: `${Math.round((backfillDone / backfill.total) * 100)}%` }} />
                        </span>
                    </div>
                )}

                {loading && <p className="v2-empty">불러오는 중...</p>}
                {!loading && error && <p className="v2-empty">카메라 정보를 불러오지 못했습니다.</p>}
                {!loading && !error && visible.length === 0 && <p className="v2-empty">조건에 맞는 카메라가 없습니다.</p>}

                {!loading && !error && visible.length > 0 && (
                    <div className="v2-cam-grid">
                        {visible.map((cam) => {
                            const stale = isStale(cam.last_seen);
                            const route = (cam.modules || []).map((place) => trimModuleId(place.module_id)).join(" → ");
                            return (
                                <button
                                    key={cam.camera_id}
                                    type="button"
                                    className={"v2-cam-card" + (stale ? " stale" : "")}
                                    onClick={() => setSelectedId(cam.camera_id)}
                                >
                                    <span className="v2-cam-card-top">
                                        <strong className="v2-cam-module">
                                            {trimModuleId(cam.current_module_id) || "-"}
                                        </strong>
                                        <span className="v2-cam-model">{cam.camera_model || "기종 정보 없음"}</span>
                                    </span>
                                    <span className="v2-cam-stats">
                                        <span>
                                            <span className="v2-muted">셔터</span>
                                            <strong className="v2-cam-num">{formatCount(cam.shutter_count)}</strong>
                                        </span>
                                        <span>
                                            <span className="v2-muted">하루 평균</span>
                                            <strong className="v2-cam-num">{formatRate(cam.shots_per_day)}</strong>
                                        </span>
                                    </span>
                                    <span className="v2-cam-meta">
                                        <span className={stale ? "v2-cam-stale" : "v2-muted"}>
                                            마지막 확인 {formatDate(cam.last_seen)}
                                        </span>
                                        <span className="v2-muted v2-cam-serial">{cam.camera_serial || "-"}</span>
                                    </span>
                                    {route && <span className="v2-muted v2-cam-route">장착 {route}</span>}
                                </button>
                            );
                        })}
                    </div>
                )}

                <p className="v2-cam-footnote">
                    셔터 횟수는 Dropbox에 올라간 사진의 EXIF에서 하루 한 번 읽습니다. 이번 달 사진은 일주일에 걸쳐 날짜별로 소급 수집합니다.
                    하루 평균은 최근 30일 기록이 하루 이상 쌓이면 표시됩니다.
                    마지막 확인이 7일을 넘긴 카메라는 강조 표시됩니다.
                </p>
            </main>

            {selected && <V2CameraSheet camera={selected} onClose={closeSheet} />}
        </div>
    );
}
