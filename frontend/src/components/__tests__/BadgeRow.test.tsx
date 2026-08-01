import { render, screen } from "@testing-library/react";
import { BadgeRow } from "../BadgeRow";

test("renders badge labels", () => {
  render(<BadgeRow badges={["novel", "feasible"]} />);
  expect(screen.getByText("novel")).toBeInTheDocument();
  expect(screen.getByText("feasible")).toBeInTheDocument();
});
