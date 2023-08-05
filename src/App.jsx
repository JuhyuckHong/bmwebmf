import { useState, useEffect } from 'react';
import { decodeJwt } from "jose";
import cookie from "react-cookies";
import Login from "./components/Login"
import Logout from './components/Logout';
import AllSites from "./components/AllSites"
import { API } from './API';
import './App.css';

function App() {
  const [auth, setAuth] = useState(false)
  useEffect(() => {
    const token = cookie.load("BM")
    if (token && decodeJwt(token).exp < parseInt(Date.now() / 1000)) {
      // delete token and
      cookie.remove("BM");
    } else if (token) {
      // if token has not expired, try login
      API.auth({ Authorization: token })
        .then((res) => setAuth(true))
        .catch((err) => console.log("error in auth", err));
    }
  }, [auth])
  return (
    <>
      <div>
        {auth ? <Logout setAuth={setAuth} /> : <Login setAuth={setAuth} />}
      </div>
      <div>
        {auth ? <AllSites /> : ""}
      </div>
    </>
  );
}

export default App;
