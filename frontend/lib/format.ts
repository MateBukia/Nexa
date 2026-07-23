export function formatGel(value: number, locale: "en" | "ka" = "en") {
  const [integer, fraction] = value.toFixed(2).split(".");
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, locale === "ka" ? " " : ",");
  const amount = `${grouped}${locale === "ka" ? "," : "."}${fraction}`;
  return locale === "ka" ? `${amount} ₾` : `₾${amount}`;
}
