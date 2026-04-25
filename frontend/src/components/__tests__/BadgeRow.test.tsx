import { render, screen } from "@testing-library/react";
import { BadgeRow } from "../BadgeRow";

test("renders badge labels", () => {
  render(<BadgeRow badges={["novel", "feasible"]} />);
  expect(screen.getByText("NOVEL")).toBeInTheDocument();
  expect(screen.getByText("FEASIBLE")).toBeInTheDocument();
});
