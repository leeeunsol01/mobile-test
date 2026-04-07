const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.goto('http://localhost:5173/?capture=true');
    await page.waitForFunction(() => window.renderDone === true);

    const dataUrl = await page.evaluate(() => {
        const canvas = document.querySelector('canvas');
        return canvas.toDataURL('image/png');
    });

    const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
    fs.writeFileSync("output.png", base64, "base64");

    await browser.close();
})    