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
            <h1>Pending Users</h1>
            <ul>
                {pendingUsers.map((user) => (
                    <li key={user.username}>
                        Username: {user.username}, Code: {user.code}
                        <button onClick={() => handleApproval(user.username)}>
                            Approve
                        </button>
                        <button onClick={() => handleDecline(user.username)}>
                            Decline
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default PendingUsers;
