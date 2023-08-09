import { API } from "../API";
import { useState } from "react";
import PasswordChecker from "./PasswordChecker";
import PasswordConfirm from "./PasswordConfirm";

function Signup() {
    const [id, setId] = useState("");
    const [pw, setPw] = useState("");
    const [pwConfirm, setPwConfirm] = useState("");
    const [code, setCode] = useState("");
    const idEventHandler = (event) => setId(event.target.value);
    const pwEventHandler = (event) => setPw(event.target.value);
    const pwConfirmEventHandler = (event) => setPwConfirm(event.target.value);
    const codeEventHandler = (event) => setCode(event.target.value);

    const RequestSignup = (event) => {
        event.preventDefault();
        const data = {
            username: id,
            password: pw,
            code,
        };

        API.signUp(data)
            .then((res) => alert(res.data.message))
            .catch((err) => alert(err.response.data.message));
    };

    return (
        <div className="SignupMain">
            <div className="SignupContent">
                <h2> Sign Up </h2>

                <form className="SignupBox" onSubmit={RequestSignup}>
                    <input
                        type="text"
                        placeholder="ID"
                        value={id}
                        onChange={idEventHandler}
                        className="FormInput"
                    />

                    <input
                        type="password"
                        placeholder="Password"
                        value={pw}
                        onChange={pwEventHandler}
                        className="FormInput"
                    />
                    {pw !== "" ? <PasswordChecker password={pw} /> : ""}
                    <input
                        type="password"
                        placeholder="Password Confirm"
                        value={pwConfirm}
                        onChange={pwConfirmEventHandler}
                        className="FormInput"
                    />
                    {pwConfirm !== "" ? (
                        <PasswordConfirm
                            password={pw}
                            passwordConfirm={pwConfirm}
                        />
                    ) : (
                        ""
                    )}
                    <input
                        type="text"
                        placeholder="회원가입 코드"
                        value={code}
                        onChange={codeEventHandler}
                        className="FormInput"
                    />
                    <button className="Submit"> 회원가입 </button>
                </form>
            </div>
        </div>
    );
}

export default Signup;
