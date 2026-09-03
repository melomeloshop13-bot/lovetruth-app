import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { generateAuthenticTarotReading } from './src/utils/tarotEngine';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy GoogleGenAI initialization
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Endpoint: AI Tarot Reading with full 78 cards awareness, zodiacs, cultural and psychological honesty
app.post('/api/gemini/tarot-reading', async (req, res) => {
  try {
    const {
      userProfile,
      partnerProfile,
      relationshipDetails,
      question,
      cards, // array of { card, isReversed, position }
      previousAnalysis
    } = req.body;

    const ai = getGenAI();

    // If Gemini is available, produce deep authentic reading
    if (ai) {
      const cardsDescription = cards
        .map(
          (c: any, i: number) =>
            `ใบที่ ${i + 1} (${c.positionLabelTh}): ${c.card.nameTh} (${c.card.nameEn}) [${
              c.isReversed ? 'กลับหัว (Reversed)' : 'หัวตั้ง (Upright)'
            }] - คีย์เวิร์ด: ${c.card.keywords.join(', ')}`
        )
        .join('\n');

      const prompt = `คุณคืออาจารย์ผู้เชี่ยวชาญศาสตร์ไพ่ทาโรต์ 78 ใบ (Tarot Master) และนักจิตวิทยาความสัมพันธ์ที่มีชื่อเสียงในการทำนายที่ "ตรงไปตรงมา แม่นยำที่สุด ไม่อวย ไม่อ้อมค้อม ตัดสินจากความจริง 100%"
กฎเหล็กสำคัญที่สุด:
1. ห้ามตอบข้อความสำเร็จรูป หรือคำตอบเดิมซ้ำเด็ดขาด! คำตอบต้องประมวลผลจากไพ่ทั้ง 3 ใบที่สุ่มเปิดได้จริง 100%
2. ต้องระบุชื่อไพ่ทั้ง 3 ใบ พร้อมระบุสถานะ [หัวตั้ง หรือ กลับหัว] และความหมายเฉพาะของแต่ละใบอย่างชัดเจน
3. ต้องตอบคำถามที่ผู้ถามถามมาโดยตรง ไม่อ้อมค้อม ชี้ให้เห็นความจริงที่ซ่อนอยู่

บริบทผู้ถาม:
- ผู้ถาม: ชื่อ ${userProfile?.name}, อายุ ${userProfile?.age}, ราศี ${userProfile?.zodiac || 'ไม่ระบุ'}, MBTI: ${userProfile?.mbti}
- คนรัก: ชื่อ ${partnerProfile?.name}, อายุ ${partnerProfile?.age}, ราศี ${partnerProfile?.zodiac || 'ไม่ระบุ'}, MBTI: ${partnerProfile?.mbti}
- สถานะความสัมพันธ์: ${relationshipDetails?.status}
- อุปสรรคที่เผชิญ: ${relationshipDetails?.obstacle || 'มีปัญหาในความสัมพันธ์'}
- คำถามที่ถามไพ่: "${question}"

ไพ่ที่สุ่มเปิดได้ 3 ใบ (จากสำรับ 78 ใบ):
${cardsDescription}

กรุณาพยากรณ์และตอบเป็นภาษาไทย โดยให้ข้อมูลในรูปแบบ JSON ตามโครงสร้างนี้:
{
  "overallPrediction": "คำทำนายภาพรวมความรักและคำตอบต่อคำถามที่ถาม โดยอ่านความหมายเชื่อมโยงกันทั้ง 3 ใบอย่างลึกซึ้งตามชื่อไพ่และตำแหน่งจริง",
  "directTruth": "ความจริงที่ไม่อวยและไม่หลอกตัวเอง สิ่งที่ผู้ถามต้องยอมรับความจริงต่อหน้าไพ่ชุดนี้",
  "accuracyPercent": 96.5,
  "accuracyReason": "เหตุผลที่ตัวเลขความแม่นยำนี้สอดคล้องกับตำแหน่งไพ่และสถานการณ์ของผู้ถาม",
  "healingGuidance": "ข้อคิดพลังบวก แนวทางออกเพื่อฮีลใจและก้าวข้ามปัญหานี้อย่างมีศักดิ์ศรีและรักตัวเอง"
}
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.7,
        },
      });

      const responseText = response.text || '{}';
      const parsed = JSON.parse(responseText);
      if (parsed.overallPrediction && parsed.directTruth) {
        return res.json({ success: true, reading: parsed });
      }
    }
  } catch (error) {
    console.error('Gemini Tarot API Error, falling back to rich authentic rule-based engine:', error);
  }

  // 100% Authentic rule-based Tarot engine reading based on real Tarot cards meaning
  const { cards, question, userProfile, partnerProfile, relationshipDetails } = req.body;
  const reading = generateAuthenticTarotReading(
    cards || [],
    question || '',
    userProfile || {},
    partnerProfile || {},
    relationshipDetails || {}
  );

  res.json({
    success: true,
    reading
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
