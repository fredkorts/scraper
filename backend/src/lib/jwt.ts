import jwt, { JsonWebTokenError, type SignOptions } from "jsonwebtoken";
import type { UserRole } from "@mabrik/shared";
import { z } from "zod";
import { config } from "../config";

interface AccessTokenPayload {
    sub: string;
    email: string;
    role: UserRole;
    type: "access";
    tokenVersion?: number;
}

const accessTokenClaimsSchema = z.object({
    sub: z.string().min(1),
    email: z.string().email(),
    role: z.enum(["free", "paid", "admin"]),
    type: z.literal("access"),
    iss: z.string().min(1),
    aud: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]),
    exp: z.number().int().positive(),
    tokenVersion: z.number().int().nonnegative().optional(),
});

const parseJwtKeyset = (raw: string): Record<string, string> => {
    const parsed = JSON.parse(raw) as unknown;

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("AUTH_JWT_KEYS_JSON must be a JSON object");
    }

    const entries = Object.entries(parsed);
    if (entries.length === 0) {
        throw new Error("AUTH_JWT_KEYS_JSON must contain at least one key");
    }

    const keyset: Record<string, string> = {};

    for (const [kid, secret] of entries) {
        if (kid.trim().length === 0) {
            throw new Error("AUTH_JWT_KEYS_JSON contains an empty kid");
        }

        if (typeof secret !== "string" || secret.length < 32) {
            throw new Error(`AUTH_JWT_KEYS_JSON key "${kid}" must have a 32+ char secret`);
        }

        keyset[kid] = secret;
    }

    return keyset;
};

const getJwtKeyMaterial = (): {
    signingSecret: string;
    signingKid?: string;
    verificationSecrets: Record<string, string>;
} => {
    if (!config.AUTH_JWT_KEYS_JSON) {
        return {
            signingSecret: config.JWT_SECRET,
            verificationSecrets: {
                default: config.JWT_SECRET,
            },
        };
    }

    const keyset = parseJwtKeyset(config.AUTH_JWT_KEYS_JSON);
    const activeKid = config.AUTH_JWT_ACTIVE_KID;

    if (!activeKid) {
        throw new Error("AUTH_JWT_ACTIVE_KID is required when AUTH_JWT_KEYS_JSON is configured");
    }

    const signingSecret = keyset[activeKid];
    if (!signingSecret) {
        throw new Error("AUTH_JWT_ACTIVE_KID does not exist in AUTH_JWT_KEYS_JSON");
    }

    return {
        signingSecret,
        signingKid: activeKid,
        verificationSecrets: {
            ...keyset,
            // Backward compatibility window for tokens minted without keyset support.
            default: config.JWT_SECRET,
        },
    };
};

const resolveVerificationSecret = (token: string): string => {
    const decoded = jwt.decode(token, { complete: true });

    if (!decoded || typeof decoded !== "object" || typeof decoded.header !== "object") {
        throw new JsonWebTokenError("jwt malformed");
    }

    if (decoded.header.alg !== "HS256") {
        throw new JsonWebTokenError("invalid algorithm");
    }

    const { verificationSecrets } = getJwtKeyMaterial();
    const headerKid = decoded.header.kid;

    if (typeof headerKid === "string" && headerKid.trim().length > 0) {
        const secret = verificationSecrets[headerKid];
        if (!secret) {
            throw new JsonWebTokenError("unknown token kid");
        }

        return secret;
    }

    return verificationSecrets.default;
};

export const signAccessToken = (payload: Omit<AccessTokenPayload, "type">): string => {
    const keyMaterial = getJwtKeyMaterial();
    const options: SignOptions = {
        algorithm: "HS256",
        expiresIn: config.ACCESS_TOKEN_TTL as SignOptions["expiresIn"],
        issuer: config.JWT_ISSUER,
        audience: config.JWT_AUDIENCE,
        ...(keyMaterial.signingKid
            ? {
                  header: {
                      kid: keyMaterial.signingKid,
                      alg: "HS256",
                  },
              }
            : {}),
    };

    return jwt.sign(
        {
            ...payload,
            type: "access",
        },
        keyMaterial.signingSecret,
        options,
    );
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
    const verificationSecret = resolveVerificationSecret(token);
    const verified = jwt.verify(token, verificationSecret, {
        algorithms: ["HS256"],
        issuer: config.JWT_ISSUER,
        audience: config.JWT_AUDIENCE,
    });

    if (typeof verified !== "object" || verified === null) {
        throw new JsonWebTokenError("invalid token payload");
    }

    const parsedClaims = accessTokenClaimsSchema.safeParse(verified);

    if (!parsedClaims.success) {
        throw new JsonWebTokenError("invalid token claims");
    }

    const claims = parsedClaims.data;

    return {
        sub: claims.sub,
        email: claims.email,
        role: claims.role,
        type: claims.type,
        tokenVersion: claims.tokenVersion,
    };
};
