import axios from "axios";

const apiBaseUrl = import.meta.env.REACT_APP_API_URL;

// axios에 baseURL, header, cors 설정 추가
const api = axios.create({
    baseURL: apiBaseUrl,
    headers: {},
    withCredentials: false,
});

// API 목록
export const API = {
    // 회원가입
    signUp: (body) => api.post("/signup", body),
    // 회원 승인 대기 목록
    pendingUsers: (headers) => api.get("/users/pending", { headers }),
    // 회원 가입 승인
    approveUser: (headers, username) =>
        api.put(`/approve/${username}`, "", { headers }),
    // 회원 가입 거절
    declineUser: (headers, username) =>
        api.put(`/decline/${username}`, "", { headers }),
    // 사용자 삭제
    deleteUser: (headers, username) =>
        api.delete(`/user/${username}`, { headers }),
    // 사용자 활성화/비활성화
    deactivateUser: (headers, username) =>
        api.put(`/user/${username}/deactivate`, "", { headers }),
    activateUser: (headers, username) =>
        api.put(`/user/${username}/activate`, "", { headers }),
    // 로그인
    signIn: (body) => api.post("/login", body),
    // 사용자 토큰 확인
    auth: (headers) => api.get("/auth", { headers }),
    // 사용자 전체 조회
    allUsers: (headers) => api.get("/users", { headers }),
    // 사용자 사이트 조회 권한 변경
    userSiteViewAuthSet: (headers, username, sites) =>
        api.put(`/user/${username}/update`, sites, { headers }),
    // 서비스 중인 전체 현장 목록 조회
    allSites: (headers) => api.get("/sites/all", { headers }),

    // 전체 현장 정보 조회(사용자 조회 권한 있는 사이트만)
    getAllInformation: (headers) => api.get("/information/all", { headers }),
    // 선택 현장 정보 조회
    getInformation: (headers, site) =>
        api.get(`/information/${site}`, { headers }),

    // Thumbnail 목록 조회
    getThumbnails: (headers) => api.get("/thumbnails", { headers }),
    // Thumbnail 이미지 조회
    getStatic: (headers, file) =>
        api.get(`/static/${file}`, { headers, responseType: "blob" }),
    // 사진 한개 조회 date: YYYY-MM-DD, photo: YYYY-MM-DD_hh-mm-ss
    getImage: (headers, site, date, photo) =>
        api.get(`/images/${site}/${date}/${photo}`, {
            headers,
            responseType: "blob",
        }),
    // 최근 사진 조회(미사용)
    getRecent: (headers, site) =>
        api.get(`/images/${site}/recent`, { headers, responseType: "blob" }),
    // 사이트에 사진이 있는 날짜 조회
    getSiteDate: (headers, site) => api.get(`/images/${site}`, { headers }),
    // 사이트 특정 날짜에 있는 사진 목록 조회
    getSiteDateList: (headers, site, date) =>
        api.get(`/images/${site}/${date}`, { headers }),
    // 사이트 특정 날짜에 있는 영상 목록 조회
    getSiteDailyVideoList: (headers, site) =>
        api.get(`/video/${site}`, { headers }),
    // 사이트 특정 날짜에 있는 영상 목록 조회
    getSiteDailyVideo: (headers, site, video) =>
        api.get(`/video/${site}/${video}`, { headers, responseType: "blob" }),
    // 서버 로그 조회
    getLogs: (headers, params) => api.get("/logs", { headers, params }),
};
