import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../test-utils";
import IndustriesTab from "../IndustriesTab";

// Mock the hooks
vi.mock("../../../hooks/useIndustries", () => ({
  useIndustries: vi.fn(),
  useCreateIndustry: vi.fn(),
  useUpdateIndustry: vi.fn(),
  useDeleteIndustry: vi.fn(),
}));

import {
  useIndustries,
  useCreateIndustry,
  useUpdateIndustry,
  useDeleteIndustry,
} from "../../../hooks/useIndustries";

describe("IndustriesTab", () => {
  const mockProjectId = "proj-1";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Industry listing", () => {
    it("should display industry count and list industries", () => {
      const mockIndustriesData = {
        items: [
          {
            id: "ind-1",
            name: "Technology",
            description: "Tech sector",
          },
          {
            id: "ind-2",
            name: "Healthcare",
            description: "Healthcare sector",
          },
        ],
        count: 2,
      };

      vi.mocked(useIndustries).mockReturnValue({
        data: mockIndustriesData,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useCreateIndustry).mockReturnValue({ isPending: false } as any);
      vi.mocked(useUpdateIndustry).mockReturnValue({ isPending: false } as any);
      vi.mocked(useDeleteIndustry).mockReturnValue({ isPending: false } as any);

      renderWithProviders(<IndustriesTab projectId={mockProjectId} />);

      expect(screen.getByText("2 Industries")).toBeInTheDocument();
      expect(screen.getByText("Technology")).toBeInTheDocument();
      expect(screen.getByText("Healthcare")).toBeInTheDocument();
    });

    it("should display empty state when no industries exist", () => {
      vi.mocked(useIndustries).mockReturnValue({
        data: { items: [], count: 0 },
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useCreateIndustry).mockReturnValue({ isPending: false } as any);
      vi.mocked(useUpdateIndustry).mockReturnValue({ isPending: false } as any);
      vi.mocked(useDeleteIndustry).mockReturnValue({ isPending: false } as any);

      renderWithProviders(<IndustriesTab projectId={mockProjectId} />);

      expect(screen.getByText("No industries created yet")).toBeInTheDocument();
      expect(
        screen.getByText("Add industries above to organize your research ideas")
      ).toBeInTheDocument();
    });

    it("should display loading indicator when fetching industries", () => {
      vi.mocked(useIndustries).mockReturnValue({
        data: { items: [], count: 0 },
        isLoading: true,
        error: null,
      } as any);

      vi.mocked(useCreateIndustry).mockReturnValue({ isPending: false } as any);
      vi.mocked(useUpdateIndustry).mockReturnValue({ isPending: false } as any);
      vi.mocked(useDeleteIndustry).mockReturnValue({ isPending: false } as any);

      renderWithProviders(<IndustriesTab projectId={mockProjectId} />);

      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("should display singular 'Industry' for count of 1", () => {
      const mockIndustriesData = {
        items: [
          {
            id: "ind-1",
            name: "Finance",
            description: "Financial sector",
          },
        ],
        count: 1,
      };

      vi.mocked(useIndustries).mockReturnValue({
        data: mockIndustriesData,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useCreateIndustry).mockReturnValue({ isPending: false } as any);
      vi.mocked(useUpdateIndustry).mockReturnValue({ isPending: false } as any);
      vi.mocked(useDeleteIndustry).mockReturnValue({ isPending: false } as any);

      renderWithProviders(<IndustriesTab projectId={mockProjectId} />);

      expect(screen.getByText("1 Industry")).toBeInTheDocument();
    });
  });

  describe("Industry descriptions", () => {
    it("should display industry description when present", () => {
      const mockIndustriesData = {
        items: [
          {
            id: "ind-1",
            name: "Technology",
            description: "Tech sector with focus on innovation",
          },
        ],
        count: 1,
      };

      vi.mocked(useIndustries).mockReturnValue({
        data: mockIndustriesData,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useCreateIndustry).mockReturnValue({ isPending: false } as any);
      vi.mocked(useUpdateIndustry).mockReturnValue({ isPending: false } as any);
      vi.mocked(useDeleteIndustry).mockReturnValue({ isPending: false } as any);

      renderWithProviders(<IndustriesTab projectId={mockProjectId} />);

      expect(
        screen.getByText("Tech sector with focus on innovation")
      ).toBeInTheDocument();
    });

    it("should not display description when null", () => {
      const mockIndustriesData = {
        items: [
          {
            id: "ind-1",
            name: "Technology",
            description: null,
          },
        ],
        count: 1,
      };

      vi.mocked(useIndustries).mockReturnValue({
        data: mockIndustriesData,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useCreateIndustry).mockReturnValue({ isPending: false } as any);
      vi.mocked(useUpdateIndustry).mockReturnValue({ isPending: false } as any);
      vi.mocked(useDeleteIndustry).mockReturnValue({ isPending: false } as any);

      renderWithProviders(<IndustriesTab projectId={mockProjectId} />);

      // Tech sector text should not appear if no description
      expect(screen.queryByText(/sector/)).not.toBeInTheDocument();
    });
  });

  describe("Add industry form", () => {
    it("should show add industry form toggle button", () => {
      vi.mocked(useIndustries).mockReturnValue({
        data: { items: [], count: 0 },
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useCreateIndustry).mockReturnValue({ isPending: false } as any);
      vi.mocked(useUpdateIndustry).mockReturnValue({ isPending: false } as any);
      vi.mocked(useDeleteIndustry).mockReturnValue({ isPending: false } as any);

      renderWithProviders(<IndustriesTab projectId={mockProjectId} />);

      expect(screen.getByText("Add Industry")).toBeInTheDocument();
    });

    it("should toggle form visibility when Add Industry button is clicked", async () => {
      const user = userEvent.setup();

      vi.mocked(useIndustries).mockReturnValue({
        data: { items: [], count: 0 },
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useCreateIndustry).mockReturnValue({ isPending: false } as any);
      vi.mocked(useUpdateIndustry).mockReturnValue({ isPending: false } as any);
      vi.mocked(useDeleteIndustry).mockReturnValue({ isPending: false } as any);

      renderWithProviders(<IndustriesTab projectId={mockProjectId} />);

      const toggleButton = screen.getByText("Add Industry");
      await user.click(toggleButton);

      expect(screen.getByText("Add New Industry")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("e.g., Healthcare, Finance, Manufacturing")).toBeInTheDocument();
    });

    it("should show Cancel button when form is open", async () => {
      const user = userEvent.setup();

      vi.mocked(useIndustries).mockReturnValue({
        data: { items: [], count: 0 },
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useCreateIndustry).mockReturnValue({ isPending: false } as any);
      vi.mocked(useUpdateIndustry).mockReturnValue({ isPending: false } as any);
      vi.mocked(useDeleteIndustry).mockReturnValue({ isPending: false } as any);

      renderWithProviders(<IndustriesTab projectId={mockProjectId} />);

      await user.click(screen.getByText("Add Industry"));

      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    it("should validate industry name is required", async () => {
      const user = userEvent.setup();
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

      vi.mocked(useIndustries).mockReturnValue({
        data: { items: [], count: 0 },
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useCreateIndustry).mockReturnValue({ isPending: false } as any);
      vi.mocked(useUpdateIndustry).mockReturnValue({ isPending: false } as any);
      vi.mocked(useDeleteIndustry).mockReturnValue({ isPending: false } as any);

      renderWithProviders(<IndustriesTab projectId={mockProjectId} />);

      await user.click(screen.getByText("Add Industry"));
      const addButton = screen.getByRole("button", { name: "Add Industry" });
      await user.click(addButton);

      // Alert should be triggered when trying to submit without name
      expect(alertSpy).toHaveBeenCalledWith("Please enter an industry name");

      alertSpy.mockRestore();
    });

    it("should submit industry with name only", async () => {
      const user = userEvent.setup();
      const mockMutateAsync = vi.fn().mockResolvedValue({ id: "ind-new" });

      vi.mocked(useIndustries).mockReturnValue({
        data: { items: [], count: 0 },
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useCreateIndustry).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as any);

      vi.mocked(useUpdateIndustry).mockReturnValue({ isPending: false } as any);
      vi.mocked(useDeleteIndustry).mockReturnValue({ isPending: false } as any);

      renderWithProviders(<IndustriesTab projectId={mockProjectId} />);

      await user.click(screen.getByText("Add Industry"));
      const input = screen.getByPlaceholderText("e.g., Healthcare, Finance, Manufacturing");
      await user.type(input, "Manufacturing");

      const addButton = screen.getByRole("button", { name: /Add Industry$/ });
      await user.click(addButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          name: "Manufacturing",
          description: null,
        });
      });
    });

    it("should submit industry with name and description", async () => {
      const user = userEvent.setup();
      const mockMutateAsync = vi.fn().mockResolvedValue({ id: "ind-new" });

      vi.mocked(useIndustries).mockReturnValue({
        data: { items: [], count: 0 },
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useCreateIndustry).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as any);

      vi.mocked(useUpdateIndustry).mockReturnValue({ isPending: false } as any);
      vi.mocked(useDeleteIndustry).mockReturnValue({ isPending: false } as any);

      renderWithProviders(<IndustriesTab projectId={mockProjectId} />);

      await user.click(screen.getByText("Add Industry"));
      const nameInput = screen.getByPlaceholderText("e.g., Healthcare, Finance, Manufacturing");
      const descInput = screen.getByPlaceholderText("Brief description of this industry");

      await user.type(nameInput, "Finance");
      await user.type(descInput, "Financial services sector");

      const addButton = screen.getByRole("button", { name: /Add Industry$/ });
      await user.click(addButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          name: "Finance",
          description: "Financial services sector",
        });
      });
    });

    it("should clear form on successful submission", async () => {
      const user = userEvent.setup();
      const mockMutateAsync = vi.fn().mockResolvedValue({ id: "ind-new" });

      vi.mocked(useIndustries).mockReturnValue({
        data: { items: [], count: 0 },
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useCreateIndustry).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as any);

      vi.mocked(useUpdateIndustry).mockReturnValue({ isPending: false } as any);
      vi.mocked(useDeleteIndustry).mockReturnValue({ isPending: false } as any);

      renderWithProviders(<IndustriesTab projectId={mockProjectId} />);

      // Open form, type name, submit
      await user.click(screen.getByText("Add Industry"));
      const input = screen.getByPlaceholderText("e.g., Healthcare, Finance, Manufacturing");
      await user.type(input, "Healthcare");

      const addButton = screen.getByRole("button", { name: /Add Industry$/ });
      await user.click(addButton);

      // Form should be hidden after submission
      await waitFor(() => {
        expect(screen.queryByText("Add New Industry")).not.toBeInTheDocument();
      });

      // Open form again and verify inputs are empty
      await user.click(screen.getByText("Add Industry"));
      const inputAgain = screen.getByPlaceholderText("e.g., Healthcare, Finance, Manufacturing") as HTMLInputElement;
      expect(inputAgain.value).toBe("");
    });

    it("should hide form on successful submission", async () => {
      const user = userEvent.setup();
      const mockMutateAsync = vi.fn().mockResolvedValue({ id: "ind-new" });

      vi.mocked(useIndustries).mockReturnValue({
        data: { items: [], count: 0 },
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useCreateIndustry).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as any);

      vi.mocked(useUpdateIndustry).mockReturnValue({ isPending: false } as any);
      vi.mocked(useDeleteIndustry).mockReturnValue({ isPending: false } as any);

      renderWithProviders(<IndustriesTab projectId={mockProjectId} />);

      await user.click(screen.getByText("Add Industry"));
      const input = screen.getByPlaceholderText("e.g., Healthcare, Finance, Manufacturing");
      await user.type(input, "Healthcare");

      const addButton = screen.getByRole("button", { name: /Add Industry$/ });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.queryByText("Add New Industry")).not.toBeInTheDocument();
      });
    });

    it("should disable button while submitting", async () => {
      vi.mocked(useIndustries).mockReturnValue({
        data: { items: [], count: 0 },
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useCreateIndustry).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: true,
      } as any);

      vi.mocked(useUpdateIndustry).mockReturnValue({ isPending: false } as any);
      vi.mocked(useDeleteIndustry).mockReturnValue({ isPending: false } as any);

      renderWithProviders(<IndustriesTab projectId={mockProjectId} />);

      // When isPending is true, verify the form cannot be opened (button is disabled)
      const addButton = screen.getByRole("button", { name: /Add Industry/ });
      expect(addButton).toBeDisabled();
    });

    it("should display error message on submission failure", async () => {
      const user = userEvent.setup();
      const mockMutateAsync = vi.fn().mockRejectedValue(new Error("Network error"));
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

      vi.mocked(useIndustries).mockReturnValue({
        data: { items: [], count: 0 },
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useCreateIndustry).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as any);

      vi.mocked(useUpdateIndustry).mockReturnValue({ isPending: false } as any);
      vi.mocked(useDeleteIndustry).mockReturnValue({ isPending: false } as any);

      renderWithProviders(<IndustriesTab projectId={mockProjectId} />);

      await user.click(screen.getByText("Add Industry"));
      const input = screen.getByPlaceholderText("e.g., Healthcare, Finance, Manufacturing");
      await user.type(input, "Healthcare");

      const addButton = screen.getByRole("button", { name: /Add Industry$/ });
      await user.click(addButton);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith("Failed to create industry: Network error");
      });

      alertSpy.mockRestore();
    });
  });

  describe("Edit industry", () => {
    it("should show Edit button for each industry", () => {
      const mockIndustriesData = {
        items: [
          {
            id: "ind-1",
            name: "Technology",
            description: "Tech sector",
          },
        ],
        count: 1,
      };

      vi.mocked(useIndustries).mockReturnValue({
        data: mockIndustriesData,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useCreateIndustry).mockReturnValue({ isPending: false } as any);
      vi.mocked(useUpdateIndustry).mockReturnValue({ isPending: false } as any);
      vi.mocked(useDeleteIndustry).mockReturnValue({ isPending: false } as any);

      renderWithProviders(<IndustriesTab projectId={mockProjectId} />);

      const editButtons = screen.getAllByText("Edit");
      expect(editButtons.length).toBeGreaterThan(0);
    });

    it("should show edit form when Edit button is clicked", async () => {
      const user = userEvent.setup();

      const mockIndustriesData = {
        items: [
          {
            id: "ind-1",
            name: "Technology",
            description: "Tech sector",
          },
        ],
        count: 1,
      };

      vi.mocked(useIndustries).mockReturnValue({
        data: mockIndustriesData,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useCreateIndustry).mockReturnValue({ isPending: false } as any);
      vi.mocked(useUpdateIndustry).mockReturnValue({ isPending: false } as any);
      vi.mocked(useDeleteIndustry).mockReturnValue({ isPending: false } as any);

      renderWithProviders(<IndustriesTab projectId={mockProjectId} />);

      const editButton = screen.getByText("Edit");
      await user.click(editButton);

      // Should see Save and Cancel buttons
      expect(screen.getByText("Save")).toBeInTheDocument();
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    it("should populate form with current values when editing", async () => {
      const user = userEvent.setup();

      const mockIndustriesData = {
        items: [
          {
            id: "ind-1",
            name: "Technology",
            description: "Tech sector",
          },
        ],
        count: 1,
      };

      vi.mocked(useIndustries).mockReturnValue({
        data: mockIndustriesData,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useCreateIndustry).mockReturnValue({ isPending: false } as any);
      vi.mocked(useUpdateIndustry).mockReturnValue({ isPending: false } as any);
      vi.mocked(useDeleteIndustry).mockReturnValue({ isPending: false } as any);

      renderWithProviders(<IndustriesTab projectId={mockProjectId} />);

      const editButton = screen.getByText("Edit");
      await user.click(editButton);

      const inputs = screen.getAllByDisplayValue("Technology");
      expect(inputs.length).toBeGreaterThan(0);
    });

    it("should save edited industry", async () => {
      const user = userEvent.setup();
      const mockMutateAsync = vi.fn().mockResolvedValue({ id: "ind-1" });

      const mockIndustriesData = {
        items: [
          {
            id: "ind-1",
            name: "Technology",
            description: "Tech sector",
          },
        ],
        count: 1,
      };

      vi.mocked(useIndustries).mockReturnValue({
        data: mockIndustriesData,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useCreateIndustry).mockReturnValue({ isPending: false } as any);
      vi.mocked(useUpdateIndustry).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as any);
      vi.mocked(useDeleteIndustry).mockReturnValue({ isPending: false } as any);

      renderWithProviders(<IndustriesTab projectId={mockProjectId} />);

      const editButton = screen.getByText("Edit");
      await user.click(editButton);

      const inputs = screen.getAllByDisplayValue("Technology");
      const nameInput = inputs[0] as HTMLInputElement;
      await user.clear(nameInput);
      await user.type(nameInput, "Advanced Tech");

      const saveButton = screen.getByText("Save");
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          name: "Advanced Tech",
          description: "Tech sector",
        });
      });
    });

    it("should cancel edit and restore original values", async () => {
      const user = userEvent.setup();

      const mockIndustriesData = {
        items: [
          {
            id: "ind-1",
            name: "Technology",
            description: "Tech sector",
          },
        ],
        count: 1,
      };

      vi.mocked(useIndustries).mockReturnValue({
        data: mockIndustriesData,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useCreateIndustry).mockReturnValue({ isPending: false } as any);
      vi.mocked(useUpdateIndustry).mockReturnValue({ isPending: false } as any);
      vi.mocked(useDeleteIndustry).mockReturnValue({ isPending: false } as any);

      renderWithProviders(<IndustriesTab projectId={mockProjectId} />);

      const editButton = screen.getByText("Edit");
      await user.click(editButton);

      const cancelButton = screen.getByText("Cancel");
      await user.click(cancelButton);

      // Should no longer see Save button
      expect(screen.queryByText("Save")).not.toBeInTheDocument();
    });

    it("should disable Save button while updating", async () => {
      const user = userEvent.setup();

      const mockIndustriesData = {
        items: [
          {
            id: "ind-1",
            name: "Technology",
            description: "Tech sector",
          },
        ],
        count: 1,
      };

      vi.mocked(useIndustries).mockReturnValue({
        data: mockIndustriesData,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useCreateIndustry).mockReturnValue({ isPending: false } as any);
      vi.mocked(useUpdateIndustry).mockReturnValue({ isPending: true } as any);
      vi.mocked(useDeleteIndustry).mockReturnValue({ isPending: false } as any);

      renderWithProviders(<IndustriesTab projectId={mockProjectId} />);

      // Click Edit to enter edit mode
      const editButton = screen.getByText("Edit");
      await user.click(editButton);

      // Now the Save button should show "Saving..." and be disabled
      const button = screen.getByText("Saving...");
      expect(button).toBeDisabled();
    });

    it("should display error message on update failure", async () => {
      const user = userEvent.setup();
      const mockMutateAsync = vi.fn().mockRejectedValue(new Error("Update failed"));
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

      const mockIndustriesData = {
        items: [
          {
            id: "ind-1",
            name: "Technology",
            description: "Tech sector",
          },
        ],
        count: 1,
      };

      vi.mocked(useIndustries).mockReturnValue({
        data: mockIndustriesData,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useCreateIndustry).mockReturnValue({ isPending: false } as any);
      vi.mocked(useUpdateIndustry).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as any);
      vi.mocked(useDeleteIndustry).mockReturnValue({ isPending: false } as any);

      renderWithProviders(<IndustriesTab projectId={mockProjectId} />);

      const editButton = screen.getByText("Edit");
      await user.click(editButton);

      const saveButton = screen.getByText("Save");
      await user.click(saveButton);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith("Failed to update industry: Update failed");
      });

      alertSpy.mockRestore();
    });
  });

  describe("Delete industry", () => {
    it("should show Delete button for each industry", () => {
      const mockIndustriesData = {
        items: [
          {
            id: "ind-1",
            name: "Technology",
            description: "Tech sector",
          },
        ],
        count: 1,
      };

      vi.mocked(useIndustries).mockReturnValue({
        data: mockIndustriesData,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useCreateIndustry).mockReturnValue({ isPending: false } as any);
      vi.mocked(useUpdateIndustry).mockReturnValue({ isPending: false } as any);
      vi.mocked(useDeleteIndustry).mockReturnValue({ isPending: false } as any);

      renderWithProviders(<IndustriesTab projectId={mockProjectId} />);

      const deleteButtons = screen.getAllByText("Delete");
      expect(deleteButtons.length).toBeGreaterThan(0);
    });

    it("should call delete when confirmed", async () => {
      const user = userEvent.setup();
      const mockMutateAsync = vi.fn().mockResolvedValue({ deleted: true });

      const mockIndustriesData = {
        items: [
          {
            id: "ind-1",
            name: "Technology",
            description: "Tech sector",
          },
        ],
        count: 1,
      };

      vi.mocked(useIndustries).mockReturnValue({
        data: mockIndustriesData,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useCreateIndustry).mockReturnValue({ isPending: false } as any);
      vi.mocked(useUpdateIndustry).mockReturnValue({ isPending: false } as any);
      vi.mocked(useDeleteIndustry).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as any);

      // Mock confirm dialog
      vi.spyOn(window, "confirm").mockReturnValue(true);

      renderWithProviders(<IndustriesTab projectId={mockProjectId} />);

      const deleteButton = screen.getByText("Delete");
      await user.click(deleteButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith("ind-1");
      });
    });

    it("should not call delete when cancelled", async () => {
      const user = userEvent.setup();
      const mockMutateAsync = vi.fn();

      const mockIndustriesData = {
        items: [
          {
            id: "ind-1",
            name: "Technology",
            description: "Tech sector",
          },
        ],
        count: 1,
      };

      vi.mocked(useIndustries).mockReturnValue({
        data: mockIndustriesData,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useCreateIndustry).mockReturnValue({ isPending: false } as any);
      vi.mocked(useUpdateIndustry).mockReturnValue({ isPending: false } as any);
      vi.mocked(useDeleteIndustry).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as any);

      // Mock confirm dialog
      vi.spyOn(window, "confirm").mockReturnValue(false);

      renderWithProviders(<IndustriesTab projectId={mockProjectId} />);

      const deleteButton = screen.getByText("Delete");
      await user.click(deleteButton);

      expect(mockMutateAsync).not.toHaveBeenCalled();
    });

    it("should disable Delete button while deleting", () => {
      const mockIndustriesData = {
        items: [
          {
            id: "ind-1",
            name: "Technology",
            description: "Tech sector",
          },
        ],
        count: 1,
      };

      vi.mocked(useIndustries).mockReturnValue({
        data: mockIndustriesData,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useCreateIndustry).mockReturnValue({ isPending: false } as any);
      vi.mocked(useUpdateIndustry).mockReturnValue({ isPending: false } as any);
      vi.mocked(useDeleteIndustry).mockReturnValue({ isPending: true } as any);

      renderWithProviders(<IndustriesTab projectId={mockProjectId} />);

      const deleteButtons = screen.getAllByText("Delete");
      deleteButtons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });

    it("should display error message on delete failure", async () => {
      const user = userEvent.setup();
      const mockMutateAsync = vi.fn().mockRejectedValue(new Error("Delete failed"));
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

      const mockIndustriesData = {
        items: [
          {
            id: "ind-1",
            name: "Technology",
            description: "Tech sector",
          },
        ],
        count: 1,
      };

      vi.mocked(useIndustries).mockReturnValue({
        data: mockIndustriesData,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useCreateIndustry).mockReturnValue({ isPending: false } as any);
      vi.mocked(useUpdateIndustry).mockReturnValue({ isPending: false } as any);
      vi.mocked(useDeleteIndustry).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as any);

      renderWithProviders(<IndustriesTab projectId={mockProjectId} />);

      const deleteButton = screen.getByText("Delete");
      await user.click(deleteButton);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith("Failed to delete industry: Delete failed");
      });

      confirmSpy.mockRestore();
      alertSpy.mockRestore();
    });
  });

  describe("Error handling", () => {
    it("should display error banner when fetching industries fails", () => {
      vi.mocked(useIndustries).mockReturnValue({
        data: { items: [], count: 0 },
        isLoading: false,
        error: new Error("Network error"),
      } as any);

      vi.mocked(useCreateIndustry).mockReturnValue({ isPending: false } as any);
      vi.mocked(useUpdateIndustry).mockReturnValue({ isPending: false } as any);
      vi.mocked(useDeleteIndustry).mockReturnValue({ isPending: false } as any);

      renderWithProviders(<IndustriesTab projectId={mockProjectId} />);

      expect(screen.getByText("Failed to load industries: Network error")).toBeInTheDocument();
    });
  });
});
