import puppeteer from "puppeteer";
import express from "express";
import fs from "node:fs";

const app = express();
const PORT = Number(process.env.PORT || 3000);
const LOGIN_URL = "https://megagamelive.com/login";
const AVIATOR_URL = "https://megagamelive.com/aviator";
const COOKIES_PATH = new URL("./cookies.json", import.meta.url).pathname;

const USERNAME = process.env.MEGAGAME_USER || "878046439";
const PASSWORD = process.env.MEGAGAME_PASS || "CARDJINHO";
const MAX_REGISTROS = Number(process.env.MAX_REGISTROS || 100);

let velasCapturadas = [];
let ultimasVelas = "";

app.use(express.json());

app.get("/api/velas", (_req, res) => {
  res.json(velasCapturadas);
});

app.post("/api/velas", (req, res) => {
  const { velas, timestamp } = req.body || {};
  if (!Array.isArray(velas)) {
    return res.status(400).json({ error: "Campo velas precisa ser um array." });
  }

  velasCapturadas.push({
    timestamp: timestamp || new Date().toISOString(),
    velas,
  });

  if (velasCapturadas.length > MAX_REGISTROS) {
    velasCapturadas = velasCapturadas.slice(-MAX_REGISTROS);
  }

  return res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

const extrairVelasNoDOM = () => {
  const seletorCustomizado = window.SELETOR_VELAS || "div.payout[appcoloredmultiplier]";

  const metodos = [
    () => document.querySelectorAll(seletorCustomizado),
    () => document.querySelectorAll("div.payout[appcoloredmultiplier]"),
    () => document.querySelectorAll('div[class*="payout"]'),
    () => {
      const bloco = document.querySelector('div[class*="payouts-block"]');
      return bloco ? bloco.querySelectorAll("div") : [];
    },
    () => {
      const widget = document.querySelector('[class*="stats"]');
      return widget ? widget.querySelectorAll("div") : [];
    },
    () => document.querySelectorAll("div"),
  ];

  let elementos = [];

  for (const metodo of metodos) {
    try {
      elementos = Array.from(metodo());
      const velas = elementos
        .map((el) => (el.textContent || "").trim())
        .filter((texto) => /^\d+\.\d+x$/i.test(texto));

      if (velas.length > 0) {
        return velas;
      }
    } catch {
      // Ignora e tenta o próximo método.
    }
  }

  return [];
};

async function carregarCookies(page) {
  if (!fs.existsSync(COOKIES_PATH)) return false;

  try {
    const cookies = JSON.parse(fs.readFileSync(COOKIES_PATH, "utf8"));
    if (Array.isArray(cookies) && cookies.length) {
      await page.setCookie(...cookies);
      return true;
    }
  } catch (error) {
    console.warn("Não foi possível carregar cookies salvos:", error.message);
  }

  return false;
}

async function salvarCookies(page) {
  const cookies = await page.cookies();
  fs.writeFileSync(COOKIES_PATH, JSON.stringify(cookies, null, 2));
}

async function fazerLogin(page) {
  await page.goto(LOGIN_URL, { waitUntil: "networkidle2", timeout: 60000 });

  await page.waitForSelector("#username", { timeout: 20000 });
  await page.waitForSelector("#password", { timeout: 20000 });

  await page.type("#username", USERNAME, { delay: 20 });
  await page.type("#password", PASSWORD, { delay: 20 });

  await Promise.all([
    page.click("#login-button"),
    page.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 }),
  ]);

  await salvarCookies(page);
}

async function iniciarBot() {
  const browser = await puppeteer.launch({
    headless: process.env.HEADLESS !== "false",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.evaluateOnNewDocument(() => {
    window.SELETOR_VELAS = "div.payout[appcoloredmultiplier]";
  });

  const temCookies = await carregarCookies(page);

  if (temCookies) {
    await page.goto(AVIATOR_URL, { waitUntil: "networkidle2", timeout: 60000 });
  }

  if (!temCookies || page.url().includes("/login")) {
    await fazerLogin(page);
    await page.goto(AVIATOR_URL, { waitUntil: "networkidle2", timeout: 60000 });
  }

  await page.waitForTimeout(5000);

  setInterval(async () => {
    try {
      const velas = await page.evaluate(extrairVelasNoDOM);
      const atual = velas.join(",");

      if (!atual || atual === ultimasVelas) {
        return;
      }

      ultimasVelas = atual;

      const registro = {
        timestamp: new Date().toISOString(),
        velas,
      };

      velasCapturadas.push(registro);
      if (velasCapturadas.length > MAX_REGISTROS) {
        velasCapturadas = velasCapturadas.slice(-MAX_REGISTROS);
      }

      console.log("🎰 Velas capturadas:", velas);
    } catch (error) {
      console.error("Erro ao capturar velas:", error.message);
    }
  }, 3000);
}

iniciarBot().catch((error) => {
  console.error("Falha fatal no bot:", error);
  process.exit(1);
});
