import { SUPPORT_ARTICLES } from "../data/supportTopics";
import { filterSupportArticles, normalizeSupportEmail } from "./supportUtils";

test("topic and multiword search combine without changing source articles", () => {
  const result = filterSupportArticles(SUPPORT_ARTICLES, "hosting", "photo order");
  expect(result.map(article => article.id)).toEqual(["edit-listing"]);
  expect(filterSupportArticles(SUPPORT_ARTICLES, "renting", "move out").some(article => article.id === "unavailable-dates")).toBe(true);
  expect(filterSupportArticles(SUPPORT_ARTICLES, "all", "   ")).toHaveLength(SUPPORT_ARTICLES.length);
  expect(filterSupportArticles(SUPPORT_ARTICLES, "payments", "unfindable word")).toHaveLength(0);
});

test("missing and invalid support addresses cannot create a contact link", () => {
  expect(normalizeSupportEmail(undefined)).toBe("");
  expect(normalizeSupportEmail(" owner+support@gmail.com ")).toBe("owner+support@gmail.com");
  for (const invalid of ["not an email", "owner@gmail.com?bcc=other@example.com", "owner@gmail.com\r\nBcc:other@example.com", "mailto:owner@gmail.com"]) {
    expect(normalizeSupportEmail(invalid)).toBe("");
  }
});
