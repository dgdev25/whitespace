import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../test-utils";
import SettingsTab from "../SettingsTab";

// Mock the API client
vi.mock("../../../api/client", () => ({
  apiClient: {
    system: {
      config: vi.fn(),
    },
  },
}));

import { apiClient } from "../../../api/client";

describe("SettingsTab", () => {
  const mockProjectId = "proj-1";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Loading state", () => {
    it("should display loading indicator while fetching config", () => {
      // Create a promise that never resolves to keep loading state
      vi.mocked(apiClient.system.config).mockImplementation(
        () => new Promise(() => {})
      );

      renderWithProviders(<SettingsTab projectId={mockProjectId} />);

      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });
  });

  describe("System config display", () => {
    it("should load and display system config on mount", async () => {
      const mockConfig = {
        runner: "claude_cli",
        analysis_model: "claude-opus-4",
        synthesis_model: "claude-opus-4",
      };

      vi.mocked(apiClient.system.config).mockResolvedValue(mockConfig);

      renderWithProviders(<SettingsTab projectId={mockProjectId} />);

      await waitFor(
        () => {
          expect(screen.getByText("claude_cli")).toBeInTheDocument();
          expect(screen.getAllByText("claude-opus-4").length).toBe(2);
        },
        { timeout: 3000 }
      );
    });

    it("should display 'Not configured' when config values are missing", async () => {
      const mockConfig = {
        runner: null,
        analysis_model: null,
        synthesis_model: null,
      };

      vi.mocked(apiClient.system.config).mockResolvedValue(mockConfig as any);

      renderWithProviders(<SettingsTab projectId={mockProjectId} />);

      await waitFor(
        () => {
          expect(screen.getAllByText("Not configured").length).toBeGreaterThan(0);
        },
        { timeout: 3000 }
      );
    });

    it("should display config display section with proper labels", async () => {
      const mockConfig = {
        runner: "claude_cli",
        analysis_model: "claude-opus-4",
        synthesis_model: "claude-opus-4",
      };

      vi.mocked(apiClient.system.config).mockResolvedValue(mockConfig);

      renderWithProviders(<SettingsTab projectId={mockProjectId} />);

      await waitFor(
        () => {
          expect(screen.getByText("LLM Runner:")).toBeInTheDocument();
          expect(screen.getByText("Analysis Model:")).toBeInTheDocument();
          expect(screen.getByText("Synthesis Model:")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it("should display system configuration card title", async () => {
      const mockConfig = {
        runner: "claude_cli",
        analysis_model: "claude-opus-4",
        synthesis_model: "claude-opus-4",
      };

      vi.mocked(apiClient.system.config).mockResolvedValue(mockConfig);

      renderWithProviders(<SettingsTab projectId={mockProjectId} />);

      await waitFor(
        () => {
          const headers = screen.getAllByText("System Configuration");
          expect(headers.length).toBeGreaterThan(0);
        },
        { timeout: 3000 }
      );
    });
  });

  describe("Quality thresholds", () => {
    it("should display quality thresholds section", async () => {
      const mockConfig = {
        runner: "claude_cli",
        analysis_model: "claude-opus-4",
        synthesis_model: "claude-opus-4",
      };

      vi.mocked(apiClient.system.config).mockResolvedValue(mockConfig);

      renderWithProviders(<SettingsTab projectId={mockProjectId} />);

      await waitFor(
        () => {
          const headers = screen.getAllByText("Quality Thresholds");
          expect(headers.length).toBeGreaterThan(0);
        },
        { timeout: 3000 }
      );
    });

    it("should display novelty threshold slider", async () => {
      const mockConfig = {
        runner: "claude_cli",
        analysis_model: "claude-opus-4",
        synthesis_model: "claude-opus-4",
      };

      vi.mocked(apiClient.system.config).mockResolvedValue(mockConfig);

      renderWithProviders(<SettingsTab projectId={mockProjectId} />);

      await waitFor(
        () => {
          expect(screen.getByText("Novelty Threshold")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it("should display feasibility threshold slider", async () => {
      const mockConfig = {
        runner: "claude_cli",
        analysis_model: "claude-opus-4",
        synthesis_model: "claude-opus-4",
      };

      vi.mocked(apiClient.system.config).mockResolvedValue(mockConfig);

      renderWithProviders(<SettingsTab projectId={mockProjectId} />);

      await waitFor(
        () => {
          expect(screen.getByText("Feasibility Threshold")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it("should display help text for novelty threshold", async () => {
      const mockConfig = {
        runner: "claude_cli",
        analysis_model: "claude-opus-4",
        synthesis_model: "claude-opus-4",
      };

      vi.mocked(apiClient.system.config).mockResolvedValue(mockConfig);

      renderWithProviders(<SettingsTab projectId={mockProjectId} />);

      await waitFor(
        () => {
          expect(
            screen.getByText(
              /Only research ideas with novelty scores above this threshold/
            )
          ).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it("should display help text for feasibility threshold", async () => {
      const mockConfig = {
        runner: "claude_cli",
        analysis_model: "claude-opus-4",
        synthesis_model: "claude-opus-4",
      };

      vi.mocked(apiClient.system.config).mockResolvedValue(mockConfig);

      renderWithProviders(<SettingsTab projectId={mockProjectId} />);

      await waitFor(
        () => {
          expect(
            screen.getByText(
              /Only research ideas with feasibility scores above this threshold/
            )
          ).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it("should allow updating novelty threshold value", async () => {
      const mockConfig = {
        runner: "claude_cli",
        analysis_model: "claude-opus-4",
        synthesis_model: "claude-opus-4",
      };

      vi.mocked(apiClient.system.config).mockResolvedValue(mockConfig);

      renderWithProviders(<SettingsTab projectId={mockProjectId} />);

      await waitFor(
        () => {
          const sliders = screen.getAllByRole("slider");
          expect(sliders.length).toBeGreaterThanOrEqual(1);
        },
        { timeout: 3000 }
      );

      const sliders = screen.getAllByRole("slider");
      const noveltySlider = sliders[0] as HTMLInputElement;

      // Update slider value directly
      fireEvent.change(noveltySlider, { target: { value: "0.8" } });

      expect(noveltySlider.value).toBe("0.8");
    });

    it("should allow updating feasibility threshold value", async () => {
      const mockConfig = {
        runner: "claude_cli",
        analysis_model: "claude-opus-4",
        synthesis_model: "claude-opus-4",
      };

      vi.mocked(apiClient.system.config).mockResolvedValue(mockConfig);

      renderWithProviders(<SettingsTab projectId={mockProjectId} />);

      await waitFor(
        () => {
          const sliders = screen.getAllByRole("slider");
          expect(sliders.length).toBeGreaterThanOrEqual(2);
        },
        { timeout: 3000 }
      );

      const sliders = screen.getAllByRole("slider");
      const feasibilitySlider = sliders[1] as HTMLInputElement;

      // Update slider value directly
      fireEvent.change(feasibilitySlider, { target: { value: "0.7" } });

      expect(feasibilitySlider.value).toBe("0.7");
    });
  });

  describe("Save settings", () => {
    it("should show Save Settings button", async () => {
      const mockConfig = {
        runner: "claude_cli",
        analysis_model: "claude-opus-4",
        synthesis_model: "claude-opus-4",
      };

      vi.mocked(apiClient.system.config).mockResolvedValue(mockConfig);

      renderWithProviders(<SettingsTab projectId={mockProjectId} />);

      await waitFor(
        () => {
          expect(screen.getByText("Save Settings")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it("should disable button and show Saving state while saving", async () => {
      const user = userEvent.setup();

      const mockConfig = {
        runner: "claude_cli",
        analysis_model: "claude-opus-4",
        synthesis_model: "claude-opus-4",
      };

      vi.mocked(apiClient.system.config).mockResolvedValue(mockConfig);

      renderWithProviders(<SettingsTab projectId={mockProjectId} />);

      await waitFor(
        () => {
          expect(screen.getByText("Save Settings")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      const saveButton = screen.getByText("Save Settings");
      await user.click(saveButton);

      expect(screen.getByText("Saving...")).toBeInTheDocument();
      expect(screen.getByText("Saving...")).toBeDisabled();
    });

    it("should display success message after save completes", async () => {
      const user = userEvent.setup();

      const mockConfig = {
        runner: "claude_cli",
        analysis_model: "claude-opus-4",
        synthesis_model: "claude-opus-4",
      };

      vi.mocked(apiClient.system.config).mockResolvedValue(mockConfig);

      // Mock alert
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

      renderWithProviders(<SettingsTab projectId={mockProjectId} />);

      await waitFor(
        () => {
          expect(screen.getByText("Save Settings")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      const saveButton = screen.getByText("Save Settings");
      await user.click(saveButton);

      await waitFor(
        () => {
          expect(alertSpy).toHaveBeenCalledWith("Settings saved successfully!");
        },
        { timeout: 3000 }
      );

      alertSpy.mockRestore();
    });

    it("should return to Save Settings button text after saving", async () => {
      const user = userEvent.setup();

      const mockConfig = {
        runner: "claude_cli",
        analysis_model: "claude-opus-4",
        synthesis_model: "claude-opus-4",
      };

      vi.mocked(apiClient.system.config).mockResolvedValue(mockConfig);

      vi.spyOn(window, "alert").mockImplementation(() => {});

      renderWithProviders(<SettingsTab projectId={mockProjectId} />);

      await waitFor(
        () => {
          expect(screen.getByText("Save Settings")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      const saveButton = screen.getByText("Save Settings");
      await user.click(saveButton);

      await waitFor(
        () => {
          expect(screen.getByText("Save Settings")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });
  });

  describe("Error handling", () => {
    it("should display error banner when config loading fails", async () => {
      vi.mocked(apiClient.system.config).mockRejectedValue(
        new Error("Network error")
      );

      renderWithProviders(<SettingsTab projectId={mockProjectId} />);

      await waitFor(
        () => {
          expect(screen.getByText(/Error loading settings/)).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it("should display error message with details", async () => {
      vi.mocked(apiClient.system.config).mockRejectedValue(
        new Error("Failed to connect to database")
      );

      renderWithProviders(<SettingsTab projectId={mockProjectId} />);

      await waitFor(
        () => {
          expect(
            screen.getByText("Error loading settings: Failed to connect to database")
          ).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });
  });

  describe("Info section", () => {
    it("should display 'About These Settings' section", async () => {
      const mockConfig = {
        runner: "claude_cli",
        analysis_model: "claude-opus-4",
        synthesis_model: "claude-opus-4",
      };

      vi.mocked(apiClient.system.config).mockResolvedValue(mockConfig);

      renderWithProviders(<SettingsTab projectId={mockProjectId} />);

      await waitFor(
        () => {
          expect(screen.getByText("About These Settings")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it("should display Quality Thresholds info card", async () => {
      const mockConfig = {
        runner: "claude_cli",
        analysis_model: "claude-opus-4",
        synthesis_model: "claude-opus-4",
      };

      vi.mocked(apiClient.system.config).mockResolvedValue(mockConfig);

      renderWithProviders(<SettingsTab projectId={mockProjectId} />);

      await waitFor(
        () => {
          const qualityHeaders = screen.getAllByText("Quality Thresholds");
          expect(qualityHeaders.length).toBeGreaterThan(1); // One in settings, one in info
        },
        { timeout: 3000 }
      );
    });

    it("should display System Configuration info card", async () => {
      const mockConfig = {
        runner: "claude_cli",
        analysis_model: "claude-opus-4",
        synthesis_model: "claude-opus-4",
      };

      vi.mocked(apiClient.system.config).mockResolvedValue(mockConfig);

      renderWithProviders(<SettingsTab projectId={mockProjectId} />);

      await waitFor(
        () => {
          const configHeaders = screen.getAllByText("System Configuration");
          expect(configHeaders.length).toBeGreaterThan(1); // One in settings, one in info
        },
        { timeout: 3000 }
      );
    });

    it("should display info about Quality Thresholds effect", async () => {
      const mockConfig = {
        runner: "claude_cli",
        analysis_model: "claude-opus-4",
        synthesis_model: "claude-opus-4",
      };

      vi.mocked(apiClient.system.config).mockResolvedValue(mockConfig);

      renderWithProviders(<SettingsTab projectId={mockProjectId} />);

      await waitFor(
        () => {
          expect(
            screen.getByText(
              /These thresholds control the quality filtering applied during synthesis/
            )
          ).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it("should display info about System Configuration", async () => {
      const mockConfig = {
        runner: "claude_cli",
        analysis_model: "claude-opus-4",
        synthesis_model: "claude-opus-4",
      };

      vi.mocked(apiClient.system.config).mockResolvedValue(mockConfig);

      renderWithProviders(<SettingsTab projectId={mockProjectId} />);

      await waitFor(
        () => {
          expect(
            screen.getByText(
              /The system configuration determines which LLM backend is used/
            )
          ).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });
  });

  describe("Page layout", () => {
    it("should display Project Settings title", async () => {
      const mockConfig = {
        runner: "claude_cli",
        analysis_model: "claude-opus-4",
        synthesis_model: "claude-opus-4",
      };

      vi.mocked(apiClient.system.config).mockResolvedValue(mockConfig);

      renderWithProviders(<SettingsTab projectId={mockProjectId} />);

      await waitFor(
        () => {
          expect(screen.getByText("Project Settings")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it("should display subtitle about configuration", async () => {
      const mockConfig = {
        runner: "claude_cli",
        analysis_model: "claude-opus-4",
        synthesis_model: "claude-opus-4",
      };

      vi.mocked(apiClient.system.config).mockResolvedValue(mockConfig);

      renderWithProviders(<SettingsTab projectId={mockProjectId} />);

      await waitFor(
        () => {
          expect(
            screen.getByText(
              "Configure synthesis thresholds and analysis parameters"
            )
          ).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it("should display message when unable to load system config", async () => {
      const mockConfig = null;

      vi.mocked(apiClient.system.config).mockResolvedValue(mockConfig as any);

      renderWithProviders(<SettingsTab projectId={mockProjectId} />);

      await waitFor(
        () => {
          expect(screen.getByText("Unable to load system config")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });
  });
});
