import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import { API } from "../API";

function PendingUsers({ setReload }) {
    const [pendingUsers, setPendingUsers] = useState([]);

    // componentDidMount 와 같은 역할을 하는 useEffect
    useEffect(() => {
        async function fetchPendingUsers() {
            try {
                const token = Cookies.get("BM");
                const response = await API.pendingUsers({
                    Authorization: token,
                });
                setPendingUsers(response.data.pending_users);
            } catch (error) {
                console.error("Error fetching pending users:", error);
            }
        }
        fetchPendingUsers();
    }, []);

    const handleApproval = async (username) => {
        try {
            const token = Cookies.get("BM");
            await API.approveUser({ Authorization: token }, username);
            // After successful approval, remove user from the pending list in UI
            setPendingUsers((prevUsers) =>
                prevUsers.filter((user) => user.username !== username),
            );
            setReload((prev) => !prev);
        } catch (error) {
            console.error(`Error approving user ${username}:`, error);
        }
    };

    const handleDecline = async (username) => {
        try {
            const token = Cookies.get("BM");
            await API.declineUser({ Authorization: token }, username);
            // After successful approval, remove user from the pending list in UI
            setPendingUsers((prevUsers) =>
                prevUsers.filter((user) => user.username !== username),
            );
            setReload((prev) => !prev);
        } catch (error) {
            console.error(`Error declining user ${username}:`, error);
        }
    };

    return (
        <div className="admin-card pending-card">
            <div className="card-header">
                <div className="card-title">가입 승인</div>
                <p className="card-subtitle">
                    대기 중인 사용자를 승인하거나 거절하세요.
                </p>
            </div>
            {pendingUsers.length === 0 ? (
                <div className="empty-state">대기 중인 사용자가 없습니다.</div>
            ) : (
                <ul className="pending-list">
                    {pendingUsers.map((user) => (
                        <li className="pending-user" key={user.username}>
                            <div className="pending-user__info">
                                <div className="pending-user__name">
                                    {user.username}
                                </div>
                                <div className="pending-user__code">
                                    가입코드 {user.code}
                                </div>
                            </div>
                            <div className="pending-user__actions">
                                <button
                                    className="admin-btn primary"
                                    onClick={() =>
                                        handleApproval(user.username)
                                    }>
                                    승인
                                </button>
                                <button
                                    className="admin-btn ghost"
                                    onClick={() =>
                                        handleDecline(user.username)
                                    }>
                                    거절
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default PendingUsers;
