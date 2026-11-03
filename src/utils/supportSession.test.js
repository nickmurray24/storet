const visitId = "00000000-0000-4000-8000-000000000001";
const requestId = number => `10000000-0000-4000-8000-${String(number).padStart(12, "0")}`;
const originalCrypto = Object.getOwnPropertyDescriptor(window, "crypto");
beforeEach(() => {
  jest.resetModules(); sessionStorage.clear();
  Object.defineProperty(window, "crypto", { configurable: true, value: { randomUUID: () => visitId } });
});
afterAll(() => { if (originalCrypto) Object.defineProperty(window, "crypto", originalCrypto); });

test("three successes survive a module reload and the same request is not counted twice", () => {
  let session = require("./supportSession");
  let visit = session.getSupportVisit();
  for (let number = 1; number <= 3; number++) visit = session.recordSupportSent(visit, requestId(number));
  expect(session.recordSupportSent(visit, requestId(3)).count).toBe(3);
  jest.resetModules(); session = require("./supportSession");
  expect(session.getSupportVisit()).toMatchObject({ id: visitId, count: 3 });
});

test("a server visit-limit response persists even if local counters were cleared", () => {
  const session = require("./supportSession");
  session.markSupportVisitLimited(session.getSupportVisit());
  jest.resetModules();
  expect(require("./supportSession").getSupportVisit().count).toBe(3);
});

test("blocked browser storage does not crash the form", () => {
  const read = jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw Error("blocked"); });
  const write = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw Error("blocked"); });
  const session = require("./supportSession");
  const visit = session.getSupportVisit();
  expect(session.recordSupportSent(visit, requestId(1)).count).toBe(1);
  expect(session.getSupportVisit().id).toBe(visitId);
  read.mockRestore(); write.mockRestore();
});
