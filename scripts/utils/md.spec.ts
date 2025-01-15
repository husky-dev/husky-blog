import { describe, expect, test } from "@jest/globals";
import { modYoutubeEmbeds, modAdmonitions } from "./md";

const youtubeEmbededContent = `

[video](https://www.youtube.com/watch?v=GoPT69y98pY)

`;

const youtubeEmbededExpected = `

<div class="proportional-box">
<iframe
  src="https://www.youtube.com/embed/GoPT69y98pY"
  width="100%"
  height="100%"
  frameborder="0"
  allow="autoplay; encrypted-media"
  allowfullscreen>
</iframe>
</div>

`;

describe("modYoutubeEmbeds()", () => {
  test("it should replace a youtube link with an embed", () => {
    expect(modYoutubeEmbeds(youtubeEmbededContent)).toBe(
      youtubeEmbededExpected
    );
  });

  test("it should not replace a youtube link with an embed", () => {
    expect(modYoutubeEmbeds("# Hello World")).toBe("# Hello World");
  });
});

const admotion01In = `

> 🚨 Якщо відправляєте дрон на тестування і маєте до нього батарею, то батарею відправляйте тільки якщо передаєте її на баланс проєкту.

`;

const admotion01Out = `

:::danger[Важливо]

Якщо відправляєте дрон на тестування і маєте до нього батарею, то батарею відправляйте тільки якщо передаєте її на баланс проєкту.

:::

`;

describe("modAdmonitions()", () => {
  test("it should replace an admonition with a div", () => {
    expect(modAdmonitions(admotion01In)).toBe(admotion01Out);
  });
});
