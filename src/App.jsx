import { useState, useEffect } from "react";
import { decodeJwt } from "jose";
import cookie from "react-cookies";
import Login from "./components/Login";
import Logout from "./components/Logout";
import AllSites from "./components/AllSites";
import { API } from "./API";
import "./App.css";
import SingleSite from "./components/SingleSite";
import Signup from "./components/Signup";
import PendingUsers from "./components/PendingUsers";

function App() {
    const [auth, setAuth] = useState(false);
    const [site, setSite] = useState(null);
    const [admin, setAdmin] = useState(false);
    useEffect(() => {
        const token = cookie.load("BM");
        if (token && decodeJwt(token).exp < parseInt(Date.now() / 1000)) {
            // delete token and
            cookie.remove("BM");
        } else if (token) {
            // if token has not expired, try login
            API.auth({ Authorization: token })
                .then((res) => {
                    const identity = res?.data.identity;
                    if (identity.class === identity.username) setAdmin(true);
                    setAuth(true);
                })
                .catch((err) => console.log("error in auth", err));
        } else {
            setAuth(false);
            setAdmin(false);
        }
    }, [auth]);

    console.log("admin: ", admin);

    return (
        <>
            <div className="user">
                {auth ? (
                    <Logout setAuth={setAuth} />
                ) : (
                    <>
                        <div>
                            <Login setAuth={setAuth} />
                        </div>
                        <div>
                            <Signup />
                        </div>
                    </>
                )}
            </div>
            <div className="display">
                {auth ? (
                    site ? (
                        <SingleSite site={site} setSite={setSite} />
                    ) : (
                        <AllSites setSite={setSite} />
                    )
                ) : (
                    ""
                )}
            </div>
            <div>{admin ? <PendingUsers /> : ""}</div>
        </>
    );
}

export default App;
