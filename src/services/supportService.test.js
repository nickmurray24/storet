import { supportService } from "./supportService";
import { requireSupabase } from "./backendServiceUtils";
jest.mock("./backendServiceUtils", () => ({ requireSupabase: jest.fn(), formatServiceResponse: (data, error = null) => ({ data, error, ok: !error }) }));
const fields = { topic: "other", name: "Renter", email: "renter@example.test", reference: "BOOK-1", subject: "Help", message: "My question" };
const ids = { requestId: "request", visitId: "visit" };

test("only a confirmed backend send returns success", async () => {
  const invoke = jest.fn().mockResolvedValue({ data: { ok: true, reference: "ST-1", visitCount: 1 } });
  requireSupabase.mockReturnValue({ supabase: { functions: { invoke } } });
  expect((await supportService.send(fields, ids)).data.reference).toBe("ST-1");
  invoke.mockResolvedValue({ data: { ok: false, reference: "ST-1" } });
  expect((await supportService.send(fields, ids)).ok).toBe(false);
});

test("backend limits produce a readable code the form can enforce", async () => {
  const invoke = jest.fn().mockResolvedValue({ error: { context: { json: async () => ({ code: "VISIT_LIMIT", error: "internal ignored" }) } } });
  requireSupabase.mockReturnValue({ supabase: { functions: { invoke } } });
  const result = await supportService.send(fields, ids);
  expect(result.error.code).toBe("VISIT_LIMIT");
  expect(result.error.message).toContain("3 support requests");
  expect(result.error.message).not.toContain("internal");
});

test("missing configuration and network failures are not reported as sent", async () => {
  requireSupabase.mockReturnValue({ error: { message: "secret configuration details" } });
  expect((await supportService.send(fields, ids)).error.message).not.toContain("secret");
  requireSupabase.mockReturnValue({ supabase: { functions: { invoke: async () => { throw Error("network"); } } } });
  expect((await supportService.send(fields, ids)).ok).toBe(false);
});
