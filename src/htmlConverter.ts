import puppeteer from "puppeteer";

export async function renderHtml(
  html: string,
  { width = 800, height = 600 } = {},
) {
  const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
  const page = await browser.newPage();

  await page.setViewport({ width, height, deviceScaleFactor: 2 });
  // setContent no longer accepts networkidle0; load still covers images and
  // stylesheets, just not fetches kicked off by script
  await page.setContent(html, { waitUntil: "load" });

  const buffer = await page.screenshot({ type: "png" });
  //const trimmed = await sharp(buffer).trim().toBuffer();
  await browser.close();
  return buffer;
}
