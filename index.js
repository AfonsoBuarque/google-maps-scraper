const express = require("express");
const puppeteer = require("puppeteer");

const app = express();

// Rota raiz
app.get("/", (req, res) => {
  res.send("Bem vindo ao Scraper Google Maps");
});

// Rota de busca no Google Maps
app.get("/search", async (req, res) => {
  const searchTerm = req.query.term;

  if (!searchTerm) {
    return res.status(400).json({ error: "O parâmetro 'term' é obrigatório." });
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: "/usr/bin/google-chrome",
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--lang=pt-BR"],
    });

    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({ "Accept-Language": "pt-BR,pt;q=0.9" });

    const url = `https://www.google.com/maps/search/${encodeURIComponent(searchTerm)}`;
    await page.goto(url, { waitUntil: "networkidle2" });

    console.log(`Pesquisando: ${searchTerm}`);

    const resultsSelector = `[aria-label="Resultados para ${searchTerm}"]`;
    await page.waitForSelector(resultsSelector, { timeout: 60000 }).catch(() => {
      throw new Error("Nenhum resultado encontrado ou seletor indisponível.");
    });

    let previousHeight = 0;
    while (true) {
      const newHeight = await page.evaluate("document.body.scrollHeight");
      if (newHeight === previousHeight) break;
      previousHeight = newHeight;
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await page.waitForTimeout(1000);
    }

    const websites = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('[data-value="Website"]'));
      return elements.map((el) => el.href || el.textContent).filter((href) => href);
    });

    return res.json({
      term: searchTerm,
      count: websites.length,
      websites,
    });
  } catch (error) {
    console.error("Erro ao realizar a pesquisa:", error);
    return res.status(500).json({ error: "Erro ao realizar a pesquisa.", details: error.message });
  } finally {
    if (browser) await browser.close();
  }
});

// Inicializar o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
