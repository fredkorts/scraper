import { describe, expect, it } from "vitest";
import { hashRecoveryCode, verifyRecoveryCodeHash } from "./mfa";

describe("mfa recovery code hashing", () => {
    it("hashes recovery codes and verifies normalized user input", async () => {
        const hash = await hashRecoveryCode("a1b2c-d3e4f");

        expect(hash).not.toContain("A1B2CD3E4F");
        expect(await verifyRecoveryCodeHash("a1b2c-d3e4f", hash)).toBe(true);
        expect(await verifyRecoveryCodeHash("A1B2C D3E4F", hash)).toBe(true);
        expect(await verifyRecoveryCodeHash("fffff-fffff", hash)).toBe(false);
    });
});
