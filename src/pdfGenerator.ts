import { PDFDocument, rgb, StandardFonts } from "pdf-lib"
import fontkit from "@pdf-lib/fontkit"
import { Sutra, AppConfig } from "./types"

/* =========================
   FONT PATHS (from /public)
   Fix: Use the same paths as in the preview
========================= */

const FONT_PATHS = {
  serif: "/fonts/NotoSerifTC-Regular.ttf",
  ming: "/fonts/NotoSerifTC-Bold.ttf",
  kai: "/fonts/LXGWWenKai-Regular.ttf",
}

/* =========================
   BACKGROUND IMAGES
========================= */

const BACKGROUND_IMAGES = {
  golden: "/patterns/golden.jpg",
  blue: "/patterns/blue.jpg",
  zen: "/patterns/bamboo.jpg",
}

/* =========================
   THEME COLORS
========================= */

const COLORS = {
  golden: {
    bg: rgb(0.99, 0.98, 0.96),
    line: rgb(0.83, 0.69, 0.22),
    text: rgb(0.36, 0.25, 0.2),
  },
  blue: {
    bg: rgb(0.96, 0.96, 0.96),
    line: rgb(0.12, 0.23, 0.54),
    text: rgb(0.12, 0.16, 0.23),
  },
  zen: {
    bg: rgb(0.98, 0.98, 0.96),
    line: rgb(0.61, 0.64, 0.69),
    text: rgb(0.07, 0.09, 0.15),
  },
}

const TRACING_COLORS = {
  red: rgb(0.94, 0.27, 0.27),
  gold: rgb(0.83, 0.69, 0.22),
  gray: rgb(0.3, 0.3, 0.3),
}

/* =========================
   HELPERS
========================= */

async function loadFont(url: string): Promise<Uint8Array> {
  try {
    // Construct the full URL correctly
    const baseUrl = window.location.origin;
    const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
    
    console.log(`Loading font from: ${fullUrl}`);
    
    const response = await fetch(fullUrl);
    if (!response.ok) {
      throw new Error(`Failed to load font: ${response.statusText} (${response.status})`);
    }
    
    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  } catch (error) {
    console.error("Font loading error:", error);
    throw error;
  }
}

async function loadImage(url: string) {
  try {
    const baseUrl = window.location.origin;
    const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
    
    const response = await fetch(fullUrl);
    if (!response.ok) {
      throw new Error(`Failed to load image: ${response.statusText}`);
    }
    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  } catch (error) {
    console.error("Image loading error:", error);
    throw error;
  }
}

/* =========================
   MAIN GENERATOR
========================= */

export async function generatePDF(
  sutra: Sutra,
  config: AppConfig
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  pdfDoc.registerFontkit(fontkit)

  /* ---------- Load Font ---------- */
  let customFont

  try {
    console.log(`Loading font from: ${FONT_PATHS[config.font]}`)
    const fontBytes = await loadFont(FONT_PATHS[config.font])
    
    // Make sure the font is properly embedded
    customFont = await pdfDoc.embedFont(fontBytes, { subset: true })
    console.log("Font loaded successfully")
  } catch (err) {
    console.error("Custom font failed to load:", err)
    // Fall back to a standard font that supports Chinese characters
    // But first, try to provide a more helpful error
    throw new Error(`無法載入字體文件: ${FONT_PATHS[config.font]}。請確保字體文件存在於正確的路徑。`)
  }

  /* ---------- Load Background ---------- */
  let bgImage: any = null
  try {
    console.log(`Loading background from: ${BACKGROUND_IMAGES[config.theme]}`)
    const imageBytes = await loadImage(BACKGROUND_IMAGES[config.theme])
    bgImage = await pdfDoc.embedJpg(imageBytes)
    console.log("Background loaded successfully")
  } catch (err) {
    console.warn("Background load failed, continuing without background")
    // Continue without background - it's optional
  }

  /* ---------- Grid Setup ---------- */
  const content = sutra.content_full.replace(/[\s\n]/g, "")
  const cols = 20
  const rows = 15
  const wordsPerPage = cols * rows
  const totalPages = Math.ceil(content.length / wordsPerPage)

  const activeTheme = COLORS[config.theme]
  const tColor = TRACING_COLORS[config.tracingColor]
  const tOpacity = config.tracingOpacity / 100

  const drawBackground = (page: any) => {
    if (!bgImage) return

    const { width, height } = page.getSize()
    const scale = Math.max(
      width / bgImage.width,
      height / bgImage.height
    )

    page.drawImage(bgImage, {
      x: 0,
      y: 0,
      width: bgImage.width * scale,
      height: bgImage.height * scale,
      opacity: 0.15,
    })
  }

  const drawCenteredText = (
    page: any,
    text: string,
    y: number,
    size: number
  ) => {
    const { width } = page.getSize()
    const textWidth = customFont.widthOfTextAtSize(text, size)

    page.drawText(text, {
      x: (width - textWidth) / 2,
      y,
      size,
      font: customFont,
      color: activeTheme.text,
    })
  }

  /* =========================
     1️⃣ Ritual Page
  ========================= */
  const ritualPage = pdfDoc.addPage([841.89, 595.28])
  drawBackground(ritualPage)

  const { height: rHeight } = ritualPage.getSize()

  drawCenteredText(ritualPage, "合掌誦念三稱", rHeight - 200, 24)
  drawCenteredText(ritualPage, "南無本師釋迦牟尼佛", rHeight - 250, 20)
  drawCenteredText(ritualPage, "開經偈", rHeight - 350, 20)
  drawCenteredText(
    ritualPage,
    "無上甚深微妙法　百千萬劫難遭遇",
    rHeight - 400,
    18
  )
  drawCenteredText(
    ritualPage,
    "我今見聞得受持　願解如來真實義",
    rHeight - 430,
    18
  )

  /* =========================
     2️⃣ Sutra Pages
  ========================= */
  for (let p = 0; p < totalPages; p++) {
    const page = pdfDoc.addPage([841.89, 595.28])
    const { width, height } = page.getSize()

    drawBackground(page)

    const marginX = 60
    const marginY = 60
    const cellSize = Math.min(
      (width - 2 * marginX) / cols,
      (height - 2 * marginY) / rows
    )

    const startX = (width - cols * cellSize) / 2
    const startY = (height - rows * cellSize) / 2

    /* Draw Grid */
    for (let i = 0; i <= cols; i++) {
      page.drawLine({
        start: { x: startX + i * cellSize, y: startY },
        end: {
          x: startX + i * cellSize,
          y: startY + rows * cellSize,
        },
        thickness: 0.5,
        color: activeTheme.line,
        opacity: 0.3,
      })
    }

    for (let j = 0; j <= rows; j++) {
      page.drawLine({
        start: { x: startX, y: startY + j * cellSize },
        end: {
          x: startX + cols * cellSize,
          y: startY + j * cellSize,
        },
        thickness: 0.5,
        color: activeTheme.line,
        opacity: 0.3,
      })
    }

    /* Draw Characters (RTL vertical) */
    const pageContent = content.slice(
      p * wordsPerPage,
      (p + 1) * wordsPerPage
    )

    for (let i = 0; i < pageContent.length; i++) {
      const char = pageContent[i]
      const col = Math.floor(i / rows)
      const row = i % rows

      const x = startX + (cols - col - 1) * cellSize + cellSize / 2
      const y = startY + (rows - row - 1) * cellSize + cellSize / 2

      const fontSize = cellSize * 0.7
      const textWidth = customFont.widthOfTextAtSize(char, fontSize)

      page.drawText(char, {
        x: x - textWidth / 2,
        y: y - fontSize / 3,
        size: fontSize,
        font: customFont,
        color: tColor,
        opacity: tOpacity,
      })
    }

    // Add page number
    const pageNumText = `元宝抄經 · ${sutra.title} · 第 ${p + 1} 頁`
    const pageNumWidth = customFont.widthOfTextAtSize(pageNumText, 9)
    
    page.drawText(pageNumText, {
      x: (width - pageNumWidth) / 2,
      y: 30,
      size: 9,
      font: customFont,
      color: activeTheme.text,
      opacity: 0.4,
    })
  }

  /* =========================
     3️⃣ Dedication Page
  ========================= */
  const dedicationPage = pdfDoc.addPage([841.89, 595.28])
  drawBackground(dedicationPage)

  const { width: dWidth, height: dHeight } = dedicationPage.getSize()

  const drawDedication = (text: string, y: number, size: number) => {
    const textWidth = customFont.widthOfTextAtSize(text, size)
    dedicationPage.drawText(text, {
      x: (dWidth - textWidth) / 2,
      y,
      size,
      font: customFont,
      color: activeTheme.text,
    })
  }

  drawDedication("回向文", dHeight - 200, 24)
  drawDedication("願以此功德　莊嚴佛淨土", dHeight - 250, 18)
  drawDedication("上報四重恩　下濟三途苦", dHeight - 280, 18)
  drawDedication("若有見聞者　悉發菩提心", dHeight - 310, 18)
  drawDedication("盡此一報身　同生極樂國", dHeight - 340, 18)
  drawDedication("我 __________ 願以此功德回向", dHeight - 450, 16)

  return pdfDoc.save()
}