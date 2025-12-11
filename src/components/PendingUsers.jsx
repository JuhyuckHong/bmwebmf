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
        <>
            <hr />
            <div className="pending-container">
                <div className="label">가입 승인</div>
                <ul>
                    {pendingUsers.map((user) => (
                        <li className="pending-user" key={user.username}>
                            <div className="pending-userinfo">
                                <strong>Username:</strong> {user.username}
                            </div>
                            <button
                                onClick={() => handleApproval(user.username)}>
                                Approve
                            </button>
                            <button
                                onClick={() => handleDecline(user.username)}>
                                Decline
                            </button>
                            <div className="pending-userinfo">
                                <strong>Code:</strong> {user.code}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </>
    );
}

export default PendingUsers;
