import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Landing from "@/pages/Landing";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";

jest.mock(
  "react-router-dom",
  () => ({
    Link: ({ children }) => <a href="/">{children}</a>,
    useNavigate: () => jest.fn(),
  }),
  { virtual: true },
);

describe("Landing", () => {
  it("renders the bundled illustration components", () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <AuthProvider>
          <Landing />
        </AuthProvider>
      </ThemeProvider>,
    );

    expect(markup).toContain("Campus placement dashboard illustration");
    expect(markup).toContain("Student profile illustration");
    expect(markup).toContain("Recruiter hiring illustration");
  });
});
