import puppeteer from "puppeteer";

export async function renderHtml(
  html: string,
  { width = 800, height = 600 } = {},
) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.setViewport({ width, height, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: "networkidle0" });

  const buffer = await page.screenshot({ type: "png" });
  //const trimmed = await sharp(buffer).trim().toBuffer();
  await browser.close();
  return buffer;
}
