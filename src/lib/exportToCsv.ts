/**
 * Export data to CSV and trigger a browser download.
 *
 * @param rows - Array of objects to export
 * @param columns - Column definitions mapping keys to display headers
 * @param filename - File name for the download (without extension)
 */
export function exportToCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: { key: keyof T; header: string }[],
  filename: string
) {
  if (rows.length === 0) return;

  const headers = columns.map((c) => c.header);
  const csvRows = [
    headers.join(","),
    ...rows.map((row) =>
      columns
        .map((col) => {
          const val = row[col.key];
          const str = val == null ? "" : String(val);
          // Escape commas and quotes in CSV values
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(",")
    ),
  ];

  const csvContent = csvRows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();

  // Cleanup
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Export reward history to CSV.
 */
export function exportRewardHistoryToCsv(
  history: {
    created_at: string;
    display_name?: string | null;
    rule_name: string;
    category: string;
    bubbles_awarded: number;
    description?: string | null;
  }[]
) {
  const today = new Date().toISOString().split("T")[0];
  exportToCsv(
    history.map((h) => ({
      date: new Date(h.created_at).toLocaleDateString("en-US"),
      rule_name: h.display_name || h.rule_name,
      category: h.category,
      bubbles_awarded: h.bubbles_awarded,
      description: h.description || "",
    })),
    [
      { key: "date", header: "Date" },
      { key: "rule_name", header: "Reward" },
      { key: "category", header: "Category" },
      { key: "bubbles_awarded", header: "Bubbles" },
      { key: "description", header: "Description" },
    ],
    `swimbuddz-rewards-${today}`
  );
}
