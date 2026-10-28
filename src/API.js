import axios from "axios";
import Cookies from "js-cookie";
import { isCurrentTokenUnauthorized } from "./authToken";

const apiBaseUrl = import.meta.env.REACT_APP_API_URL;
const relayBaseUrl = import.meta.env.REACT_APP_RELAY_URL;
const relay = axios.create({
    baseURL: relayBaseUrl,
    headers: {},
    withCredentials: false,
});

// axios에 baseURL, header, cors 설정 추가
const api = axios.create({
    baseURL: apiBaseUrl,
    headers: {},
    withCredentials: false,
});

// 현재 토큰으로 보낸 요청이 401이면 App에서 등록한 로그아웃 콜백 호출
// (쿠키 삭제는 콜백에서 처리)
let unauthorizedHandler = null;
export const setUnauthorizedHandler = (handler) => {
    unauthorizedHandler = handler;
};

const handleResponseError = (error) => {
    if (isCurrentTokenUnauthorized(error, Cookies.get("BM"))) {
        if (unauthorizedHandler) unauthorizedHandler();
    }
    return Promise.reject(error);
};

api.interceptors.response.use((response) => response, handleResponseError);
relay.interceptors.response.use((response) => response, handleResponseError);

// 경로 변수 인코딩
const enc = encodeURIComponent;

// API 목록
export const API = {
    // 회원가입
    signUp: (body) => api.post("/signup", body),
    // 회원 승인 대기 목록
    pendingUsers: (headers) => api.get("/users/pending", { headers }),
    // 회원 가입 승인
    approveUser: (headers, username) =>
        api.put(`/approve/${enc(username)}`, "", { headers }),
    // 회원 가입 거절
    declineUser: (headers, username) =>
        api.put(`/decline/${enc(username)}`, "", { headers }),
    // 사용자 삭제
    deleteUser: (headers, username) =>
        api.delete(`/user/${enc(username)}`, { headers }),
    // 사용자 활성화/비활성화
    deactivateUser: (headers, username) =>
        api.put(`/user/${enc(username)}/deactivate`, "", { headers }),
    activateUser: (headers, username) =>
        api.put(`/user/${enc(username)}/activate`, "", { headers }),
    // 로그인
    signIn: (body) => api.post("/login", body),
    // 사용자 토큰 확인
    auth: (headers) => api.get("/auth", { headers }),
    // 사용자 전체 조회
    allUsers: (headers) => api.get("/users", { headers }),
    // 사용자 사이트 조회 권한 변경
    userSiteViewAuthSet: (headers, username, sites) =>
        api.put(`/user/${enc(username)}/update`, sites, { headers }),
    // 서비스 중인 전체 현장 목록 조회
    allSites: (headers) => api.get("/sites/all", { headers }),

    // 전체 현장 정보 조회(사용자 조회 권한 있는 사이트만)
    getAllInformation: (headers) => api.get("/information/all", { headers }),
    // 선택 현장 정보 조회
    getInformation: (headers, site) =>
        api.get(`/information/${enc(site)}`, { headers }),

    // Thumbnail 목록 조회
    getThumbnails: (headers) => api.get("/thumbnails", { headers }),
    // Thumbnail 이미지 조회 (file은 서버가 준 경로에 호출부가 쿼리스트링을 붙여 넘기므로 인코딩하지 않음)
    getStatic: (headers, file) =>
        api.get(`/static/${file}`, { headers, responseType: "blob" }),
    // 사진 한개 조회 date: YYYY-MM-DD, photo: YYYY-MM-DD_hh-mm-ss
    getImage: (headers, site, date, photo) =>
        api.get(`/images/${enc(site)}/${enc(date)}/${enc(photo)}`, {
            headers,
            responseType: "blob",
        }),
    // 최근 사진 조회(미사용)
    getRecent: (headers, site) =>
        api.get(`/images/${enc(site)}/recent`, { headers, responseType: "blob" }),
    // 사이트에 사진이 있는 날짜 조회
    getSiteDate: (headers, site) => api.get(`/images/${enc(site)}`, { headers }),
    // 사이트 특정 날짜에 있는 사진 목록 조회
    getSiteDateList: (headers, site, date) =>
        api.get(`/images/${enc(site)}/${enc(date)}`, { headers }),
    // 사이트 특정 날짜에 있는 영상 목록 조회
    getSiteDailyVideoList: (headers, site) =>
        api.get(`/video/${enc(site)}`, { headers }),
    // 사이트 특정 날짜에 있는 영상 목록 조회
    getSiteDailyVideo: (headers, site, video) =>
        api.get(`/video/${enc(site)}/${enc(video)}`, { headers, responseType: "blob" }),
    // 서버 로그 조회
    getLogs: (headers, params) => api.get("/logs", { headers, params }),
    // 모듈 최신 현황 조회
    getLatest: (headers) => relay.get("/latest", { headers }),
    // 모듈 히스토리 조회
    getHistory: (headers, moduleId, hours = 24) =>
        relay.get(`/history/${enc(moduleId)}`, { headers, params: { hours } }),
    // 모듈 업데이트 시작
    startModuleUpdate: (headers, moduleId) =>
        relay.post(`/modules/${enc(moduleId)}/update`, "", { headers }),
    // 모듈 업데이트 SSE 스트림 URL
    getModuleUpdateEventsUrl: (moduleId, jobId) =>
        `${relayBaseUrl}/modules/${enc(moduleId)}/update/events?job_id=${enc(jobId)}`,
    // 모듈 활성 업데이트 조회
    getActiveModuleUpdate: (headers, moduleId) =>
        relay.get(`/modules/${enc(moduleId)}/update-active`, { headers }),
    // 촬영 시간·간격 변경 (레거시는 apply_mode: next_boot | reboot_now)
    setModuleSchedule: (headers, moduleId, body) =>
        relay.post(`/modules/${enc(moduleId)}/schedule`, body, { headers }),
    // 운영 타임라인 조회
    getOperationTimeline: (headers, params) =>
        relay.get("/operation-timeline", { headers, params }),
    // 카메라별 요약 (기종, 장착 모듈, 셔터 횟수)
    getCameras: (headers) => relay.get("/cameras", { headers }),
    // 카메라 셔터 횟수 기록 (days=0이면 전체)
    getCameraHistory: (headers, cameraId, days = 90) =>
        relay.get(`/cameras/${enc(cameraId)}`, { headers, params: { days } }),
};
