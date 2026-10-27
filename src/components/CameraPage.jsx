import { useState, useEffect, useMemo, useCallback } from "react";
import Cookies from "js-cookie";
import { API } from "../API";
import "../CSS/Camera.css";

const trimModuleId = (id) => (id == null ? "" : String(Number(id)));

const formatCount = (value) => (value == null ? "-" : value.toLocaleString("ko-KR"));

const formatDate = (value) => (value ? value.slice(0, 16) : "-");

const daysSince = (value) => {
    if (!value) return null;
    const parsed = new Date(value.replace(" ", "T"));
    if (Number.isNaN(parsed.getTime())) return null;
    return Math.floor((Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24));
};

const SORTS = {
    shutter: (a, b) => (b.shutter_count ?? -1) - (a.shutter_count ?? -1),
    rate: (a, b) => (b.shots_per_day ?? -1) - (a.shots_per_day ?? -1),
    module: (a, b) =>
        String(a.current_module_id ?? "").localeCompare(String(b.current_module_id ?? ""), undefined, { numeric: true }),
    model: (a, b) => String(a.camera_model ?? "").localeCompare(String(b.camera_model ?? "")),
    lastSeen: (a, b) => String(b.last_seen ?? "").localeCompare(String(a.last_seen ?? "")),
};

function CameraDetail({ camera }) {
    const [readings, setReadings] = useState(null);

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

    const recent = readings ? [...readings].reverse().slice(0, 10) : [];

    return (
        <div className="camera-detail">
            <div className="camera-detail-section">
                <h4>장착 이력</h4>
                {camera.modules.length === 0 ? (
                    <div className="camera-muted">기록 없음</div>
                ) : (
                    <table className="camera-subtable">
                        <thead>
                            <tr><th>모듈</th><th>처음 확인</th><th>마지막 확인</th></tr>
                        </thead>
                        <tbody>
                            {camera.modules.map((place) => (
                                <tr key={place.module_id}>
                                    <td>{trimModuleId(place.module_id)}</td>
                                    <td>{formatDate(place.first_seen)}</td>
                                    <td>{formatDate(place.last_seen)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            <div className="camera-detail-section">
                <h4>셔터 횟수 기록 (최근 10건)</h4>
                {readings === null && <div className="camera-muted">불러오는 중...</div>}
                {readings !== null && recent.length === 0 && <div className="camera-muted">기록 없음</div>}
                {recent.length > 0 && (
                    <table className="camera-subtable">
                        <thead>
                            <tr><th>수집 시각</th><th>모듈</th><th>셔터 횟수</th><th>사진</th></tr>
                        </thead>
                        <tbody>
                            {recent.map((reading) => (
                                <tr key={`${reading.collected_at}-${reading.module_id}`}>
                                    <td>{formatDate(reading.collected_at)}</td>
                                    <td>{trimModuleId(reading.module_id)}</td>
                                    <td className="camera-num">{formatCount(reading.shutter_count)}</td>
                                    <td className="camera-muted">{reading.photo_file || "-"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

export default function CameraPage() {
    const [cameras, setCameras] = useState([]);
    const [backfill, setBackfill] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [query, setQuery] = useState("");
    const [model, setModel] = useState("all");
    const [sortKey, setSortKey] = useState("shutter");
    const [expanded, setExpanded] = useState(null);

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

    const headerCell = (key, label, className) => (
        <th
            className={(className || "") + (sortKey === key ? " is-sorted" : "")}
            onClick={() => setSortKey(key)}
            title="클릭해서 정렬"
        >
            {label}
        </th>
    );

    return (
        <div className="camera-page">
            <div className="camera-card">
                <div className="camera-toolbar">
                    <h2 className="camera-toolbar-title">카메라 정보</h2>
                    <span className="camera-summary">
                        카메라 {cameras.length}대 · 셔터 횟수 확인 {withShutter}대
                        {backfill && backfill.total > 0 && backfill.pending + backfill.error > 0 && (
                            <> · 과거 기록 수집 중 {backfill.total - backfill.pending}/{backfill.total}</>
                        )}
                    </span>
                    <input
                        type="search"
                        placeholder="모듈 / 기종 / 시리얼 검색"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <select value={model} onChange={(e) => setModel(e.target.value)}>
                        <option value="all">전체 기종</option>
                        {models.map((name) => (
                            <option key={name} value={name}>{name}</option>
                        ))}
                    </select>
                    <button type="button" className="camera-refresh" onClick={load} disabled={loading}>
                        새로고침
                    </button>
                </div>

                {loading && <div className="camera-empty">불러오는 중...</div>}
                {!loading && error && <div className="camera-empty">카메라 정보를 불러오지 못했습니다.</div>}
                {!loading && !error && visible.length === 0 && (
                    <div className="camera-empty">조건에 맞는 카메라가 없습니다.</div>
                )}

                {!loading && !error && visible.length > 0 && (
                    <div className="camera-table-wrap">
                        <table className="camera-table">
                            <thead>
                                <tr>
                                    {headerCell("module", "모듈")}
                                    {headerCell("model", "기종")}
                                    <th>시리얼</th>
                                    {headerCell("shutter", "셔터 횟수", "camera-num")}
                                    {headerCell("rate", "하루 평균", "camera-num")}
                                    <th>셔터 확인</th>
                                    {headerCell("lastSeen", "마지막 확인")}
                                    <th>장착 이력</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visible.map((cam) => {
                                    const isOpen = expanded === cam.camera_id;
                                    const stale = daysSince(cam.last_seen);
                                    return [
                                        <tr
                                            key={cam.camera_id}
                                            className={"camera-row" + (isOpen ? " is-open" : "")}
                                            onClick={() => setExpanded(isOpen ? null : cam.camera_id)}
                                        >
                                            <td className="camera-module">{trimModuleId(cam.current_module_id) || "-"}</td>
                                            <td>{cam.camera_model || "-"}</td>
                                            <td className="camera-serial">{cam.camera_serial}</td>
                                            <td className="camera-num camera-shutter">{formatCount(cam.shutter_count)}</td>
                                            <td className="camera-num">
                                                {cam.shots_per_day == null ? "-" : formatCount(Math.round(cam.shots_per_day))}
                                            </td>
                                            <td className="camera-muted">{formatDate(cam.shutter_count_at)}</td>
                                            <td className={stale != null && stale > 7 ? "camera-stale" : undefined}>
                                                {formatDate(cam.last_seen)}
                                            </td>
                                            <td className="camera-muted">
                                                {cam.modules.map((place) => trimModuleId(place.module_id)).join(" → ") || "-"}
                                            </td>
                                        </tr>,
                                        isOpen && (
                                            <tr key={`${cam.camera_id}-detail`} className="camera-detail-row">
                                                <td colSpan={8}>
                                                    <CameraDetail camera={cam} />
                                                </td>
                                            </tr>
                                        ),
                                    ];
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                <div className="camera-footnote">
                    셔터 횟수는 Dropbox에 올라간 사진의 EXIF에서 하루 한 번 읽습니다. 이번 달 사진은 일주일에 걸쳐 날짜별로 소급 수집합니다.
                    하루 평균은 최근 30일 기록이 하루 이상 쌓이면 표시됩니다.
                    마지막 확인이 7일을 넘긴 카메라는 강조 표시됩니다.
                </div>
            </div>
        </div>
    );
}
