import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AuthGate } from "./AuthGate";

describe("AuthGate", () => {
  it("allows signed-out entry to the Watch", () => {
    const markup = renderToStaticMarkup(
      createElement(
        AuthGate,
        null,
        createElement("main", null, "Watch Board"),
      ),
    );

    expect(markup).toContain("Watch Board");
  });
});
