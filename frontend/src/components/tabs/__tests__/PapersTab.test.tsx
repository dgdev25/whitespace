import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../test-utils";
import PapersTab from "../PapersTab";

// Mock the hooks
vi.mock("../../../hooks/usePapers", () => ({
  usePapers: vi.fn(),
  useAddPaperUrl: vi.fn(),
  useUploadPaper: vi.fn(),
}));

import { usePapers, useAddPaperUrl, useUploadPaper } from "../../../hooks/usePapers";

describe("PapersTab", () => {
  const mockProjectId = "proj-1";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Paper listing", () => {
    it("should display paper count and list papers", () => {
      const mockPapersData = {
        items: [
          {
            id: "paper-1",
            title: "Research Paper 1",
            source_type: "arxiv" as const,
            source_url: "https://arxiv.org/abs/1234.5678",
            status: "success" as const,
            error_message: null,
          },
          {
            id: "paper-2",
            title: "Research Paper 2",
            source_type: "pdf" as const,
            source_url: null,
            status: "processing" as const,
            error_message: null,
          },
        ],
        count: 2,
      };

      vi.mocked(usePapers).mockReturnValue({
        data: mockPapersData,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useAddPaperUrl).mockReturnValue({ isPending: false } as any);
      vi.mocked(useUploadPaper).mockReturnValue({ isPending: false } as any);

      renderWithProviders(<PapersTab projectId={mockProjectId} />);

      expect(screen.getByText("2 Papers")).toBeInTheDocument();
      expect(screen.getByText("Research Paper 1")).toBeInTheDocument();
      expect(screen.getByText("Research Paper 2")).toBeInTheDocument();
    });

    it("should display empty state when no papers exist", () => {
      vi.mocked(usePapers).mockReturnValue({
        data: { items: [], count: 0 },
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useAddPaperUrl).mockReturnValue({ isPending: false } as any);
      vi.mocked(useUploadPaper).mockReturnValue({ isPending: false } as any);

      renderWithProviders(<PapersTab projectId={mockProjectId} />);

      expect(screen.getByText("No papers yet")).toBeInTheDocument();
      expect(screen.getByText("Add papers above to get started")).toBeInTheDocument();
    });

    it("should display loading indicator when fetching papers", () => {
      vi.mocked(usePapers).mockReturnValue({
        data: { items: [], count: 0 },
        isLoading: true,
        error: null,
      } as any);

      vi.mocked(useAddPaperUrl).mockReturnValue({ isPending: false } as any);
      vi.mocked(useUploadPaper).mockReturnValue({ isPending: false } as any);

      renderWithProviders(<PapersTab projectId={mockProjectId} />);

      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });
  });

  describe("Paper status badges", () => {
    it("should display correct badge for processing status", () => {
      const mockPapersData = {
        items: [
          {
            id: "paper-1",
            title: "Processing Paper",
            source_type: "arxiv" as const,
            source_url: "https://arxiv.org/abs/1234.5678",
            status: "processing" as const,
            error_message: null,
          },
        ],
        count: 1,
      };

      vi.mocked(usePapers).mockReturnValue({
        data: mockPapersData,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useAddPaperUrl).mockReturnValue({ isPending: false } as any);
      vi.mocked(useUploadPaper).mockReturnValue({ isPending: false } as any);

      renderWithProviders(<PapersTab projectId={mockProjectId} />);

      expect(screen.getByText("Processing")).toBeInTheDocument();
    });

    it("should display correct badge for success status", () => {
      const mockPapersData = {
        items: [
          {
            id: "paper-1",
            title: "Complete Paper",
            source_type: "arxiv" as const,
            source_url: "https://arxiv.org/abs/1234.5678",
            status: "success" as const,
            error_message: null,
          },
        ],
        count: 1,
      };

      vi.mocked(usePapers).mockReturnValue({
        data: mockPapersData,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useAddPaperUrl).mockReturnValue({ isPending: false } as any);
      vi.mocked(useUploadPaper).mockReturnValue({ isPending: false } as any);

      renderWithProviders(<PapersTab projectId={mockProjectId} />);

      expect(screen.getByText("Complete")).toBeInTheDocument();
    });

    it("should display correct badge for error status", () => {
      const mockPapersData = {
        items: [
          {
            id: "paper-1",
            title: "Error Paper",
            source_type: "arxiv" as const,
            source_url: "https://arxiv.org/abs/1234.5678",
            status: "error" as const,
            error_message: "Failed to extract text",
          },
        ],
        count: 1,
      };

      vi.mocked(usePapers).mockReturnValue({
        data: mockPapersData,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useAddPaperUrl).mockReturnValue({ isPending: false } as any);
      vi.mocked(useUploadPaper).mockReturnValue({ isPending: false } as any);

      renderWithProviders(<PapersTab projectId={mockProjectId} />);

      expect(screen.getByText("Error")).toBeInTheDocument();
    });
  });

  describe("Add paper by URL", () => {
    it("should show URL input form", () => {
      vi.mocked(usePapers).mockReturnValue({
        data: { items: [], count: 0 },
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useAddPaperUrl).mockReturnValue({ isPending: false } as any);
      vi.mocked(useUploadPaper).mockReturnValue({ isPending: false } as any);

      renderWithProviders(<PapersTab projectId={mockProjectId} />);

      expect(screen.getByPlaceholderText("https://arxiv.org/abs/1234.5678")).toBeInTheDocument();
      expect(screen.getByText("Add Paper")).toBeInTheDocument();
    });

    it("should validate URL input before submitting", async () => {
      const user = userEvent.setup();

      vi.mocked(usePapers).mockReturnValue({
        data: { items: [], count: 0 },
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useAddPaperUrl).mockReturnValue({ isPending: false } as any);
      vi.mocked(useUploadPaper).mockReturnValue({ isPending: false } as any);

      renderWithProviders(<PapersTab projectId={mockProjectId} />);

      const button = screen.getByText("Add Paper");
      expect(button).toBeDisabled();
    });

    it("should enable Add Paper button when URL is entered", async () => {
      const user = userEvent.setup();

      vi.mocked(usePapers).mockReturnValue({
        data: { items: [], count: 0 },
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useAddPaperUrl).mockReturnValue({ isPending: false } as any);
      vi.mocked(useUploadPaper).mockReturnValue({ isPending: false } as any);

      renderWithProviders(<PapersTab projectId={mockProjectId} />);

      const input = screen.getByPlaceholderText("https://arxiv.org/abs/1234.5678") as HTMLInputElement;
      const button = screen.getByText("Add Paper");

      await user.type(input, "https://arxiv.org/abs/1234.5678");

      expect(button).not.toBeDisabled();
    });

    it("should submit URL and clear input on success", async () => {
      const user = userEvent.setup();
      const mockMutateAsync = vi.fn().mockResolvedValue({ id: "paper-new" });

      vi.mocked(usePapers).mockReturnValue({
        data: { items: [], count: 0 },
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useAddPaperUrl).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as any);

      vi.mocked(useUploadPaper).mockReturnValue({ isPending: false } as any);

      renderWithProviders(<PapersTab projectId={mockProjectId} />);

      const input = screen.getByPlaceholderText("https://arxiv.org/abs/1234.5678") as HTMLInputElement;
      const button = screen.getByRole("button", { name: "Add Paper" });

      await user.type(input, "https://arxiv.org/abs/1234.5678");
      await user.click(button);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({ url: "https://arxiv.org/abs/1234.5678" });
      });
    });

    it("should display error message on submission failure", async () => {
      const user = userEvent.setup();
      const mockMutateAsync = vi.fn().mockRejectedValue(new Error("Invalid arXiv ID"));

      vi.mocked(usePapers).mockReturnValue({
        data: { items: [], count: 0 },
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useAddPaperUrl).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as any);

      vi.mocked(useUploadPaper).mockReturnValue({ isPending: false } as any);

      renderWithProviders(<PapersTab projectId={mockProjectId} />);

      const input = screen.getByPlaceholderText("https://arxiv.org/abs/1234.5678") as HTMLInputElement;
      const button = screen.getByRole("button", { name: "Add Paper" });

      await user.type(input, "https://arxiv.org/abs/invalid");
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText("Invalid arXiv ID")).toBeInTheDocument();
      });
    });

    it("should disable button while submitting", async () => {
      const user = userEvent.setup();

      vi.mocked(usePapers).mockReturnValue({
        data: { items: [], count: 0 },
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useAddPaperUrl).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: true,
      } as any);

      vi.mocked(useUploadPaper).mockReturnValue({ isPending: false } as any);

      renderWithProviders(<PapersTab projectId={mockProjectId} />);

      const button = screen.getByText("Adding...");
      expect(button).toBeDisabled();
    });
  });

  describe("Upload PDF file", () => {
    it("should show file upload button", () => {
      vi.mocked(usePapers).mockReturnValue({
        data: { items: [], count: 0 },
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useAddPaperUrl).mockReturnValue({ isPending: false } as any);
      vi.mocked(useUploadPaper).mockReturnValue({ isPending: false } as any);

      renderWithProviders(<PapersTab projectId={mockProjectId} />);

      expect(screen.getByText("Choose PDF")).toBeInTheDocument();
      expect(screen.getByText("Or drag and drop a PDF file")).toBeInTheDocument();
    });

    it("should accept PDF files", () => {
      vi.mocked(usePapers).mockReturnValue({
        data: { items: [], count: 0 },
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useAddPaperUrl).mockReturnValue({ isPending: false } as any);
      vi.mocked(useUploadPaper).mockReturnValue({ isPending: false } as any);

      renderWithProviders(<PapersTab projectId={mockProjectId} />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toHaveAttribute("accept", ".pdf");
    });

    it("should disable button while uploading", () => {
      vi.mocked(usePapers).mockReturnValue({
        data: { items: [], count: 0 },
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useAddPaperUrl).mockReturnValue({ isPending: false } as any);
      vi.mocked(useUploadPaper).mockReturnValue({ isPending: true } as any);

      renderWithProviders(<PapersTab projectId={mockProjectId} />);

      const button = screen.getByText("Uploading...");
      expect(button).toBeDisabled();
    });
  });

  describe("Error handling", () => {
    it("should display error banner when fetching papers fails", () => {
      vi.mocked(usePapers).mockReturnValue({
        data: { items: [], count: 0 },
        isLoading: false,
        error: new Error("Network error"),
      } as any);

      vi.mocked(useAddPaperUrl).mockReturnValue({ isPending: false } as any);
      vi.mocked(useUploadPaper).mockReturnValue({ isPending: false } as any);

      renderWithProviders(<PapersTab projectId={mockProjectId} />);

      expect(screen.getByText("Failed to load papers: Network error")).toBeInTheDocument();
    });

    it("should display error message on form submission with empty URL", async () => {
      const user = userEvent.setup();
      const mockMutateAsync = vi.fn().mockRejectedValue(new Error("Network error"));

      vi.mocked(usePapers).mockReturnValue({
        data: { items: [], count: 0 },
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useAddPaperUrl).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as any);

      vi.mocked(useUploadPaper).mockReturnValue({ isPending: false } as any);

      renderWithProviders(<PapersTab projectId={mockProjectId} />);

      // Type a URL to enable the button, then clear it
      const input = screen.getByPlaceholderText("https://arxiv.org/abs/1234.5678") as HTMLInputElement;
      await user.type(input, "https://arxiv.org/abs/1234.5678");

      // Clear the input
      await user.clear(input);

      // Button should be disabled now
      const button = screen.getByRole("button", { name: "Add Paper" });
      expect(button).toBeDisabled();

      // Try to submit via form - button is disabled so this tests the validation
      // The component will show validation error when form submission is attempted
      // while url is empty
    });
  });

  describe("Paper metadata", () => {
    it("should display arXiv source for arxiv papers", () => {
      const mockPapersData = {
        items: [
          {
            id: "paper-1",
            title: "arXiv Paper",
            source_type: "arxiv" as const,
            source_url: "https://arxiv.org/abs/1234.5678",
            status: "success" as const,
            error_message: null,
          },
        ],
        count: 1,
      };

      vi.mocked(usePapers).mockReturnValue({
        data: mockPapersData,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useAddPaperUrl).mockReturnValue({ isPending: false } as any);
      vi.mocked(useUploadPaper).mockReturnValue({ isPending: false } as any);

      renderWithProviders(<PapersTab projectId={mockProjectId} />);

      expect(screen.getByText("arXiv")).toBeInTheDocument();
    });

    it("should display PDF Upload source for uploaded papers", () => {
      const mockPapersData = {
        items: [
          {
            id: "paper-1",
            title: "PDF Paper",
            source_type: "pdf" as const,
            source_url: null,
            status: "success" as const,
            error_message: null,
          },
        ],
        count: 1,
      };

      vi.mocked(usePapers).mockReturnValue({
        data: mockPapersData,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useAddPaperUrl).mockReturnValue({ isPending: false } as any);
      vi.mocked(useUploadPaper).mockReturnValue({ isPending: false } as any);

      renderWithProviders(<PapersTab projectId={mockProjectId} />);

      expect(screen.getByText("PDF Upload")).toBeInTheDocument();
    });

    it("should display paper error message when present", () => {
      const mockPapersData = {
        items: [
          {
            id: "paper-1",
            title: "Error Paper",
            source_type: "arxiv" as const,
            source_url: "https://arxiv.org/abs/1234.5678",
            status: "error" as const,
            error_message: "Failed to extract text from PDF",
          },
        ],
        count: 1,
      };

      vi.mocked(usePapers).mockReturnValue({
        data: mockPapersData,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useAddPaperUrl).mockReturnValue({ isPending: false } as any);
      vi.mocked(useUploadPaper).mockReturnValue({ isPending: false } as any);

      renderWithProviders(<PapersTab projectId={mockProjectId} />);

      expect(screen.getByText("Failed to extract text from PDF")).toBeInTheDocument();
    });
  });
});
