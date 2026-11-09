import { hostFromApiUrl, parseServerConfigReply, serverConfigRequest } from "./serverConfig";

describe("hostFromApiUrl", () => {
  it("takes the host from API URLs", () => {
    expect(hostFromApiUrl("https://api.tst.energiegedrag.nl/v3")).toBe("api.tst.energiegedrag.nl");
    expect(hostFromApiUrl("https://API.energiegedrag.nl")).toBe("api.energiegedrag.nl");
    expect(hostFromApiUrl("http://localhost:8080/v3")).toBe("localhost");
  });
  it("returns null for something that is not a URL", () => {
    expect(hostFromApiUrl("api.energiegedrag.nl")).toBeNull();
    expect(hostFromApiUrl("")).toBeNull();
  });
});

describe("server config messages", () => {
  it("builds the request", () => {
    expect(JSON.parse(serverConfigRequest("api.energiegedrag.nl"))).toEqual({ server: "api.energiegedrag.nl" });
  });
  it("reads an accepted reply", () => {
    expect(parseServerConfigReply('{"ok":true,"server":"api.energiegedrag.nl"}')).toEqual({
      kind: "ok",
      server: "api.energiegedrag.nl",
    });
  });
  it("reads a refusal with the allowed servers", () => {
    expect(
      parseServerConfigReply('{"ok":false,"error":"server not allowed","allowed":["api.energiegedrag.nl"]}'),
    ).toEqual({ kind: "refused", error: "server not allowed", allowed: ["api.energiegedrag.nl"] });
  });
  it("does not crash on garbage", () => {
    expect(parseServerConfigReply("<html>").kind).toBe("unreadable");
  });
});
