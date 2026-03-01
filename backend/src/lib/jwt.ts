import jwt, { type SignOptions } from "jsonwebtoken";
import type { UserRole } from "@mabrik/shared";
import { config } from "../config";

export interface AccessTokenPayload {
    sub: string;
    email: string;
    role: UserRole;
    type: "access";
}

export const signAccessToken = (payload: Omit<AccessTokenPayload, "type">): string =>
    jwt.sign(
        {
            ...payload,
            type: "access",
        },
        config.JWT_SECRET,
        {
            expiresIn: config.ACCESS_TOKEN_TTL as SignOptions["expiresIn"],
            issuer: config.JWT_ISSUER,
            audience: config.JWT_AUDIENCE,
        },
    );

export const verifyAccessToken = (token: string): AccessTokenPayload =>
    jwt.verify(token, config.JWT_SECRET, {
        issuer: config.JWT_ISSUER,
        audience: config.JWT_AUDIENCE,
    }) as AccessTokenPayload;
