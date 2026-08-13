import { describe, expect, it } from "vitest";

import { createCsv, safeCsvCell } from "./csv";

describe("CSV export safety", () => {
  it("neutralizes spreadsheet formulas and escapes quotes", () => {
    expect(safeCsvCell('=HYPERLINK("https://attacker.invalid")')).toBe(
      '"\'=HYPERLINK(""https://attacker.invalid"")"',
    );
    expect(safeCsvCell("+1+1")).toBe('"\'+1+1"');
  });

  it("produces a stable CRLF-delimited document", () => {
    expect(createCsv(["Name", "Price"], [["Laptop", 1200]])).toBe(
      '"Name","Price"\r\n"Laptop","1200"',
    );
  });
});
