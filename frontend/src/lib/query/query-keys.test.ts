import { queryKeys } from "./query-keys";

describe("query keys", () => {
    it("creates stable auth key", () => {
        expect(queryKeys.auth.me()).toEqual(["auth", "me"]);
    });

    it("includes params in list keys", () => {
        expect(queryKeys.runs.list({ page: 2, sort: "startedAt" })).toEqual([
            "runs",
            "list",
            { page: 2, sort: "startedAt" },
        ]);
    });
});
