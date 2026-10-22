import test from "node:test";
import assert from "node:assert/strict";
import { UnsecuredJWT } from "jose";

import {
    isCurrentTokenUnauthorized,
    buildAuthCookieOptions,
} from "../authToken.js";

const error401 = (Authorization) => ({
    response: { status: 401 },
    config: { headers: { Authorization } },
});

test("isCurrentTokenUnauthorized only matches 401 sent with the current token", () => {
    assert.equal(isCurrentTokenUnauthorized(error401("Bearer a"), "Bearer a"), true);
    // 재로그인 후 이전 토큰 요청의 늦은 401은 무시
    assert.equal(isCurrentTokenUnauthorized(error401("Bearer old"), "Bearer new"), false);
    // 토큰 없이 보낸 요청(로그인 실패 등)은 무시
    assert.equal(isCurrentTokenUnauthorized(error401(undefined), undefined), false);
});

test("isCurrentTokenUnauthorized ignores non-401 and network errors", () => {
    const error500 = { response: { status: 500 }, config: { headers: { Authorization: "Bearer a" } } };
    assert.equal(isCurrentTokenUnauthorized(error500, "Bearer a"), false);
    assert.equal(isCurrentTokenUnauthorized(new Error("Network Error"), "Bearer a"), false);
    assert.equal(isCurrentTokenUnauthorized(undefined, "Bearer a"), false);
});

test("buildAuthCookieOptions sets secure only on https and expires at JWT exp", () => {
    const exp = 2000000000;
    const token = new UnsecuredJWT({}).setExpirationTime(exp).encode();

    const https = buildAuthCookieOptions(token, "https:");
    assert.equal(https.sameSite, "strict");
    assert.equal(https.secure, true);
    assert.equal(https.expires.getTime(), exp * 1000);

    assert.equal(buildAuthCookieOptions(token, "http:").secure, false);
});

test("buildAuthCookieOptions falls back to a session cookie on undecodable tokens", () => {
    const options = buildAuthCookieOptions("not-a-jwt", "https:");
    assert.equal(options.expires, undefined);
    assert.equal(options.secure, true);
});
