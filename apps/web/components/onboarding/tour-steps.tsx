import type { Step } from "onborda";

// Tour interface (not exported from onborda but used internally)
interface Tour {
  tour: string;
  steps: Step[];
}

export const onboardingTours: Tour[] = [
  {
    tour: "mcp-setup",
    steps: [
      {
        icon: <>&#128075;</>,
        title: "One-Time Setup",
        content: (
          <>
            Welcome to FrontFace! After this quick 2-minute setup, you can
            manage your chatbot entirely from your IDE.
          </>
        ),
        selector: "#onboarding-welcome",
        side: "bottom",
        showControls: true,
        pointerPadding: 10,
        pointerRadius: 10,
        nextRoute: "/settings", // Navigate to settings when clicking Next
      },
      {
        icon: <>&#128273;</>,
        title: "Generate Your API Key",
        content: (
          <>
            Create an API key to connect AI tools like Cursor or Claude Code.
            This is the <strong>only manual step</strong> - everything else
            happens in your IDE.
          </>
        ),
        selector: "#onboarding-api-key",
        side: "bottom",
        showControls: true,
        pointerPadding: 15,
        pointerRadius: 10,
        prevRoute: "/dashboard",
      },
      {
        icon: <>&#10024;</>,
        title: "Click to Generate",
        content: (
          <>
            Click this button to create your API key. Keep it safe - you&apos;ll
            only need to do this once!
          </>
        ),
        selector: "#onboarding-generate-btn",
        side: "bottom",
        showControls: true,
        pointerPadding: 10,
        pointerRadius: 10,
      },
      {
        icon: <>&#128203;</>,
        title: "Copy MCP Config",
        content: (
          <>
            This configuration tells your AI tool how to connect to FrontFace.
            Copy it - you&apos;ll paste it into your IDE settings next.
          </>
        ),
        selector: "#onboarding-mcp-config",
        side: "top",
        showControls: true,
        pointerPadding: 15,
        pointerRadius: 10,
      },
      {
        icon: <>&#127881;</>,
        title: "You're All Set!",
        content: (
          <>
            Paste this config into your IDE&apos;s MCP settings. From now on, just
            ask your AI:{" "}
            <em>&quot;Add FAQ about shipping to my chatbot&quot;</em>
          </>
        ),
        selector: "#onboarding-mcp-config",
        side: "top",
        showControls: true,
        pointerPadding: 15,
        pointerRadius: 10,
      },
    ],
  },
];
