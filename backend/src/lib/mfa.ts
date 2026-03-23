import bcrypt from "bcrypt";
import { createCipheriv, createDecipheriv, createHmac, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { config } from "../config";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const TOTP_PERIOD_SECONDS = 30;
const TOTP_DIGITS = 6;
const TOTP_WINDOW = 1;

const normalizeBase32 = (input: string): string => input.replace(/=+$/g, "").replace(/\s+/g, "").toUpperCase();

const base32Encode = (buffer: Buffer): string => {
    let bits = 0;
    let value = 0;
    let output = "";

    for (const byte of buffer) {
        value = (value << 8) | byte;
        bits += 8;

        while (bits >= 5) {
            output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }

    if (bits > 0) {
        output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
    }

    return output;
};

const base32Decode = (input: string): Buffer => {
    const normalized = normalizeBase32(input);
    let bits = 0;
    let value = 0;
    const bytes: number[] = [];

    for (const char of normalized) {
        const index = BASE32_ALPHABET.indexOf(char);
        if (index === -1) {
            throw new Error("Invalid base32 input");
        }

        value = (value << 5) | index;
        bits += 5;

        if (bits >= 8) {
            bytes.push((value >>> (bits - 8)) & 255);
            bits -= 8;
        }
    }

    return Buffer.from(bytes);
};

const generateTotpAt = (secret: string, timestampMs: number): string => {
    const counter = Math.floor(timestampMs / 1000 / TOTP_PERIOD_SECONDS);
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigInt64BE(BigInt(counter));

    const secretBuffer = base32Decode(secret);
    const hash = createHmac("sha1", secretBuffer).update(counterBuffer).digest();
    const offset = hash[hash.length - 1] & 0x0f;
    const binaryCode =
        ((hash[offset] & 0x7f) << 24) |
        ((hash[offset + 1] & 0xff) << 16) |
        ((hash[offset + 2] & 0xff) << 8) |
        (hash[offset + 3] & 0xff);
    const otp = binaryCode % 10 ** TOTP_DIGITS;
    return String(otp).padStart(TOTP_DIGITS, "0");
};

export const generateTotpSecret = (): string => base32Encode(randomBytes(20));

export const verifyTotpCode = (secret: string, code: string, nowMs = Date.now()): boolean => {
    const normalizedCode = code.replace(/\s+/g, "");
    if (!/^\d{6}$/.test(normalizedCode)) {
        return false;
    }

    for (let offset = -TOTP_WINDOW; offset <= TOTP_WINDOW; offset += 1) {
        const candidate = generateTotpAt(secret, nowMs + offset * TOTP_PERIOD_SECONDS * 1000);
        if (timingSafeEqual(Buffer.from(candidate), Buffer.from(normalizedCode))) {
            return true;
        }
    }

    return false;
};

const buildAesKey = (): Buffer =>
    createHash("sha256")
        .update(config.AUTH_MFA_ENCRYPTION_KEY ?? "mfa-key-disabled")
        .digest();

export const encryptMfaSecret = (secret: string): string => {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", buildAesKey(), iv);
    const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();

    return `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
};

export const decryptMfaSecret = (encryptedValue: string): string => {
    const [ivEncoded, tagEncoded, payloadEncoded] = encryptedValue.split(".");
    if (!ivEncoded || !tagEncoded || !payloadEncoded) {
        throw new Error("Invalid encrypted secret format");
    }

    const iv = Buffer.from(ivEncoded, "base64url");
    const tag = Buffer.from(tagEncoded, "base64url");
    const payload = Buffer.from(payloadEncoded, "base64url");

    const decipher = createDecipheriv("aes-256-gcm", buildAesKey(), iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([decipher.update(payload), decipher.final()]).toString("utf8");
};

export const normalizeRecoveryCode = (value: string): string =>
    value
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");

const randomRecoveryCodeChunk = (): string => randomBytes(3).toString("hex").slice(0, 5).toUpperCase();

export const generateRecoveryCodes = (count = 8): string[] =>
    Array.from({ length: count }, () => `${randomRecoveryCodeChunk()}-${randomRecoveryCodeChunk()}`);

export const hashRecoveryCode = async (value: string): Promise<string> =>
    bcrypt.hash(normalizeRecoveryCode(value), config.BCRYPT_ROUNDS);

export const verifyRecoveryCodeHash = async (value: string, recoveryCodeHash: string): Promise<boolean> =>
    bcrypt.compare(normalizeRecoveryCode(value), recoveryCodeHash);
