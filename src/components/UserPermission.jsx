import { useEffect, useState } from "react";
import { API } from "../API";
import cookie from "react-cookies";

function UserPermission({ reload, setReload }) {
    const [users, setUsers] = useState([]);
    const [allSites, setAllSites] = useState(["site1", "site2", "site3"]);

    useEffect(() => {
        async function fetchData() {
            try {
                const resUsers = await API.allUsers({
                    Authorization: cookie.load("BM"),
                });
                setUsers(resUsers.data);

                const resSites = await API.allSites({
                    Authorization: cookie.load("BM"),
                });
                setAllSites(resSites.data);
            } catch (error) {
                console.error("Error fetching users:", error);
            }
        }

        fetchData();
    }, [reload]);

    return (
        <div className="App">
            <h1>User List</h1>
            <UserList users={users} setReload={setReload} allSites={allSites} />
        </div>
    );
}

function UserList({ users, setReload, allSites }) {
    return (
        <div>
            {users.map((user) => (
                <div key={user.username}>
                    <hr style={{ border: "solid grey 2px" }} />
                    <h2>User: {user.username}</h2>
                    <span>Access sites: {user.sites?.join(", ")}</span>
                    <ModifySiteForm
                        username={user.username}
                        user={user}
                        setReload={setReload}
                        allSites={allSites}
                    />
                </div>
            ))}
        </div>
    );
}

function ModifySiteForm({ username, user, setReload, allSites }) {
    const [selectedSite, setSelectedSite] = useState("");
    const [operation, setOperation] = useState("ADD"); // <--- 초기 operation 상태 설정

    const handleModifySites = async (e, all = false) => {
        e.preventDefault();

        console.log("handel:", selectedSite);
        if (!selectedSite && !all) {
            return;
        }

        let updatedSites;
        if (all) {
            updatedSites = operation === "ADD" ? allSites : [];
        } else {
            if (operation === "ADD") {
                updatedSites = [...user.sites, selectedSite];
            } else if (operation === "REMOVE") {
                updatedSites = user.sites.filter(
                    (site) => site !== selectedSite,
                );
            }
        }

        try {
            await API.userSiteViewAuthSet(
                {
                    Authorization: cookie.load("BM"),
                },
                username,
                { sites: updatedSites },
            );

            const action = operation === "ADD" ? "added" : "removed";
            alert(
                all
                    ? `All sites ${action} successfully!`
                    : `Site "${selectedSite}" ${action} successfully!`,
            );

            setSelectedSite("");
            setReload((prev) => !prev);
        } catch (error) {
            console.error(
                `Error ${operation.toLowerCase()}ing user's sites:`,
                error,
            );
            alert("Failed to modify site.");
        }
    };

    return (
        <>
            <hr />
            <h3>Modify Sites: </h3>
            <button
                onClick={() =>
                    setOperation((prev) => (prev === "ADD" ? "REMOVE" : "ADD"))
                }>
                Toggle to {operation === "ADD" ? "REMOVE" : "ADD"}
            </button>
            <select
                value={selectedSite}
                onChange={(e) => setSelectedSite(e.target.value)}
                disabled={
                    operation === "ADD" && user.sites.includes(selectedSite)
                }>
                <option value="" disabled>
                    Select a site
                </option>
                {allSites
                    .filter((site) => {
                        if (operation === "ADD") {
                            return !user.sites.includes(site); // ADD일 때는 권한이 없는 사이트만 필터링
                        } else if (operation === "REMOVE") {
                            return user.sites.includes(site); // REMOVE일 때는 권한이 있는 사이트만 필터링
                        }
                        return true; // 기본값
                    })
                    .map((site) => (
                        <option key={site} value={site}>
                            {site}
                        </option>
                    ))}
            </select>
            <button onClick={(e) => handleModifySites(e)}>
                {operation} Selected Site
            </button>
            <button onClick={(e) => handleModifySites(e, true)}>
                {operation} All
            </button>
            <hr />
        </>
    );
}

export default UserPermission;
