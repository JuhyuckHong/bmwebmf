import { useState, useEffect } from "react";
import cookie from "react-cookies";
import { API } from "../API";

function PendingUsers() {
    const [pendingUsers, setPendingUsers] = useState([]);

    // componentDidMount 와 같은 역할을 하는 useEffect
    useEffect(() => {
        async function fetchPendingUsers() {
            try {
                const token = cookie.load("BM");
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
            const token = cookie.load("BM");
            await API.approveUser({ Authorization: token }, username);
            // After successful approval, remove user from the pending list in UI
            setPendingUsers((prevUsers) =>
                prevUsers.filter((user) => user.username !== username),
            );
        } catch (error) {
            console.error(`Error approving user ${username}:`, error);
        }
    };

    const handleDecline = async (username) => {
        try {
            const token = cookie.load("BM");
            await API.declineUser({ Authorization: token }, username);
            // After successful approval, remove user from the pending list in UI
            setPendingUsers((prevUsers) =>
                prevUsers.filter((user) => user.username !== username),
            );
        } catch (error) {
            console.error(`Error declining user ${username}:`, error);
        }
    };

    return (
        <div>
            <label>가입 승인:</label>
            <ul>
                {pendingUsers.map((user) => (
                    <li className="pending-user" key={user.username}>
                        <div className="pending-userinfo">
                            <strong>Username:</strong> {user.username}
                        </div>
                        <button onClick={() => handleApproval(user.username)}>
                            Approve
                        </button>
                        <button onClick={() => handleDecline(user.username)}>
                            Decline
                        </button>
                        <div className="pending-userinfo">
                            <strong>Code:</strong> {user.code}
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default PendingUsers;
