import { API } from '../API'
import cookie from "react-cookies"
import { useState } from 'react'

function Login({ setAuth }) {
    const [id, setId] = useState("")
    const [pw, setPw] = useState("")
    const idEventHandler = (event) => setId(event.target.value)
    const pwEventHandler = (event) => setPw(event.target.value)

    const RequestLogin = (event) => {
        event.preventDefault()
        const data = {
            username: id,
            password: pw,
        }

        API.signIn(data).then((res) => {
            cookie.save("BM", "Bearer " + res.data.access_token);
            alert(res.data.message);
            setAuth(true)
        }).catch((err) => {
            event.preventDefault()
            console.log(err)
            // alert(err.data.message)
        })
    }

    return (
        <div className="LoginMain">
            <div className="LoginContent">
                <h2> Sign In </h2>

                <form className="LoginBox" onSubmit={RequestLogin}>
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
                    <button className="Submit"> Submit </button>
                </form>
            </div>
        </div>
    );
}

export default Login