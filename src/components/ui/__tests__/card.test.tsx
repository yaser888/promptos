import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card } from "../card";

describe("Card", () => {
  it("renders children", () => {
    render(<Card>Content</Card>);
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("applies glass variant", () => {
    render(<Card glass>Glass</Card>);
    const card = screen.getByText("Glass");
    expect(card.className).toContain("glass");
  });

  it("applies hover variant", () => {
    render(<Card hover>Hover</Card>);
    const card = screen.getByText("Hover");
    expect(card.className).toContain("hover");
  });
});
