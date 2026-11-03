export function normalizeSupportEmail(value = "") {
  const email = String(value || "").trim();
  return /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email) ? email : "";
}

function searchableText(value) {
  return String(value || "").toLowerCase().replace(/[-–—]/g, " ").replace(/\s+/g, " ").trim();
}

export function filterSupportArticles(articles, category = "all", query = "") {
  const words = searchableText(query).split(" ").filter(Boolean);
  return articles.filter(article => {
    if (category !== "all" && article.category !== category) return false;
    const text = searchableText(`${article.question} ${article.answer} ${(article.keywords || []).join(" ")}`);
    return words.every(word => text.includes(word));
  });
}
