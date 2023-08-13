import { API } from "../API";
import cookie from "react-cookies";
import { useState } from "react";

function Login({ setAuth, handleLoginToggle }) {
    const [id, setId] = useState("");
    const [pw, setPw] = useState("");
    const idEventHandler = (event) => setId(event.target.value);
    const pwEventHandler = (event) => setPw(event.target.value);

    const RequestLogin = (event) => {
        event.preventDefault();
        const data = {
            username: id,
            password: pw,
        };

        API.signIn(data)
            .then((res) => {
                cookie.save("BM", "Bearer " + res.data.access_token);
                alert(res.data.message);
                setAuth(true);
            })
            .catch((err) => {
                alert(err.response.data.message);
            });
    };

    return (
        <div className="LoginMain">
            <div className="LoginContent">
                <h2 className="title">
                    빌드모션 웹 모니터링
                    <br />
                    <h3 className="subtitle">로그인</h3>
                    <br />
                </h2>

                <form className="LoginBox" onSubmit={RequestLogin}>
                    <input
                        type="text"
                        placeholder="아이디"
                        value={id}
                        onChange={idEventHandler}
                        className="FormInput"
                    />

                    <input
                        type="password"
                        placeholder="비밀번호"
                        value={pw}
                        onChange={pwEventHandler}
                        className="FormInput"
                    />
                    <div className="button-container">
                        <button
                            type="button"
                            className="login-toggle"
                            onClick={handleLoginToggle}>
                            {" "}
                            가입하기{" "}
                        </button>
                        <button className="Submit"> 로그인 </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default Login;
