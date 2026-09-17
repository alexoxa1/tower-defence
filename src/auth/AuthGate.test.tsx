import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AuthGate } from "./AuthGate";

describe("AuthGate", () => {
  it("allows signed-out entry to the Watch", () => {
    const markup = renderToStaticMarkup(
      <AuthGate>
        <main>Watch Board</main>
      </AuthGate>,
    );

    expect(markup).toContain("Watch Board");
  });
});
