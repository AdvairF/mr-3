import { describe, it, expect } from "vitest";
import { parseBRDate, parseBRValue } from "../parseInputBR.js";

describe("parseBRDate", () => {
  it("converts BR DD/MM/AAAA to ISO", () => {
    expect(parseBRDate("10/05/2026")).toBe("2026-05-10");
  });
  it("converts BR DD-MM-AAAA to ISO", () => {
    expect(parseBRDate("10-05-2026")).toBe("2026-05-10");
  });
  it("is idempotent for ISO YYYY-MM-DD", () => {
    expect(parseBRDate("2026-05-10")).toBe("2026-05-10");
  });
  it("pads single-digit day/month", () => {
    expect(parseBRDate("1/5/2026")).toBe("2026-05-01");
  });
  it("returns null for invalid string", () => {
    expect(parseBRDate("invalid")).toBeNull();
  });
  it("returns null for empty string", () => {
    expect(parseBRDate("")).toBeNull();
  });
  it("returns null for null/undefined", () => {
    expect(parseBRDate(null)).toBeNull();
    expect(parseBRDate(undefined)).toBeNull();
  });
  it("returns null for non-string", () => {
    expect(parseBRDate(123)).toBeNull();
    expect(parseBRDate({})).toBeNull();
  });
});

describe("parseBRValue", () => {
  it("parses R$ 1.234,56 (BR with prefix and space)", () => {
    expect(parseBRValue("R$ 1.234,56")).toBe(1234.56);
  });
  it("parses R$1.234,56 (BR with prefix no space)", () => {
    expect(parseBRValue("R$1.234,56")).toBe(1234.56);
  });
  it("parses 1.234,56 (BR sem prefixo)", () => {
    expect(parseBRValue("1.234,56")).toBe(1234.56);
  });
  it("parses 1234,56 (apenas vírgula decimal)", () => {
    expect(parseBRValue("1234,56")).toBe(1234.56);
  });
  it("is idempotent for JS-style 1234.56", () => {
    expect(parseBRValue("1234.56")).toBe(1234.56);
  });
  it("parses inteiro string 1234", () => {
    expect(parseBRValue("1234")).toBe(1234);
  });
  it("passes through finite numbers", () => {
    expect(parseBRValue(1234.56)).toBe(1234.56);
    expect(parseBRValue(0)).toBe(0);
  });
  it("returns null for empty string", () => {
    expect(parseBRValue("")).toBeNull();
  });
  it("returns null for non-numeric string", () => {
    expect(parseBRValue("abc")).toBeNull();
  });
  it("returns null for null/undefined", () => {
    expect(parseBRValue(null)).toBeNull();
    expect(parseBRValue(undefined)).toBeNull();
  });
  it("returns null for NaN/Infinity", () => {
    expect(parseBRValue(NaN)).toBeNull();
    expect(parseBRValue(Infinity)).toBeNull();
  });
  it("returns null for non-string non-number", () => {
    expect(parseBRValue({})).toBeNull();
    expect(parseBRValue([])).toBeNull();
  });
});
