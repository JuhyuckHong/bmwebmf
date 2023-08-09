import axios from "axios";

// axios에 baseURL, header, cors 설정 추가
const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL,
    headers: {},
    withCredentials: false,
});

// API 목록
export const API = {
    // 회원가입
    signUp: (body) => api.post("/signup", body),
    // 회원 승인 대기 목록
    pendingUsers: (headers) => api.get("/users/pending", { headers }),
    // 회원 승인
    approveUser: (headers, username) =>
        api.put(`/approve/${username}`, { headers }),
    // 로그인
    signIn: (body) => api.post("/login", body),
    // 사용자 토큰 확인
    auth: (headers) => api.get("/auth", { headers }),
    // Thumbnail 목록 조회
    getThumbnails: (headers) => api.get("/thumbnails", { headers }),
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
};
