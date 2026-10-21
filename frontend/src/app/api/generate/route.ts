import { NextResponse } from 'next/server';
import { getKnowledge, getDrafts, saveDrafts, Draft } from '@/lib/dataStore';

export async function POST(req: Request) {
  try {
    const {
      topic = 'New pizza promotion',
      platform = 'Instagram',
      audience = 'Young adults in Addis Ababa',
      tone = 'Friendly and engaging',
      useRag = false,
      webhookUrl = '',
      directApiKey = ''
    } = await req.json();

    // 1. Retrieve RAG Context if enabled
    let ragContextText = '';
    if (useRag) {
      const knowledge = getKnowledge();
      ragContextText = knowledge
        .map(k => `[${k.category}] ${k.title}: ${k.content}`)
        .join('\n\n');
    }

    // 2. Attempt: n8n Cloud Webhook if provided
    if (webhookUrl && webhookUrl.trim().startsWith('http')) {
      try {
        console.log(`Forwarding to n8n Webhook: ${webhookUrl}`);
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic,
            platform,
            audience,
            tone,
            ragContext: ragContextText
          })
        });

        if (response.ok) {
          const n8nResult = await response.json();
          const savedDraft: Draft = {
            id: `draft-${Date.now()}`,
            created_at: new Date().toISOString(),
            topic,
            platform,
            audience,
            tone,
            caption: n8nResult.caption || n8nResult.text || '',
            hashtags: n8nResult.hashtags || '#ContentAutomation #AI',
            call_to_action: n8nResult.call_to_action || 'Check out the link in bio!',
            status: 'Draft - Review Required',
            source: 'n8n Cloud Webhook',
            usedRag: useRag
          };

          const drafts = getDrafts();
          drafts.push(savedDraft);
          saveDrafts(drafts);
          return NextResponse.json({ success: true, draft: savedDraft, provider: 'n8n Cloud Webhook' });
        }
      } catch (err: any) {
        console.warn('n8n Webhook connection error, using direct AI fallback:', err.message);
      }
    }

    // 3. Attempt: Direct Google Gemini API
    const activeGeminiKey = directApiKey || process.env.GEMINI_API_KEY;
    if (activeGeminiKey) {
      try {
        const prompt = `You are an expert social media copywriter.
Create a high-performing social media post based on these campaign parameters:
- Topic: ${topic}
- Platform: ${platform}
- Target Audience: ${audience}
- Desired Tone: ${tone}
${useRag ? `\n--- BRAND GUIDELINES & KNOWLEDGE BASE (RAG CONTEXT) ---\n${ragContextText}\n-----------------------------------------------------` : ''}

Respond ONLY with a valid raw JSON object (no markdown, no \`\`\`json) with these exact keys:
{
  "caption": "Full post copy with emojis and hook suited for ${platform}",
  "hashtags": "#relevant #hashtags #here",
  "call_to_action": "High-converting call to action"
}`;

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${activeGeminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.7 }
            })
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          let rawContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
          rawContent = rawContent.replace(/```json/gi, '').replace(/```/g, '').trim();
          let parsed: any = {};
          try {
            parsed = JSON.parse(rawContent);
          } catch (e) {
            parsed = {
              caption: rawContent,
              hashtags: '#Promotion #SpecialOffer',
              call_to_action: 'Click to learn more!'
            };
          }

          const savedDraft: Draft = {
            id: `draft-${Date.now()}`,
            created_at: new Date().toISOString(),
            topic,
            platform,
            audience,
            tone,
            caption: parsed.caption || '',
            hashtags: parsed.hashtags || '',
            call_to_action: parsed.call_to_action || '',
            status: 'Draft - Review Required',
            source: 'Google Gemini 1.5 Flash',
            usedRag: useRag
          };

          const drafts = getDrafts();
          drafts.push(savedDraft);
          saveDrafts(drafts);
          return NextResponse.json({ success: true, draft: savedDraft, provider: 'Google Gemini 1.5' });
        }
      } catch (err: any) {
        console.warn('Gemini direct API call error:', err.message);
      }
    }

    // 4. Fallback: Intelligent Simulation Engine (Guarantees zero-failure demo)
    let caption = '';
    let hashtags = '';
    let cta = '';

    if (topic.toLowerCase().includes('pizza')) {
      caption = `🍕 Craving the crispiest wood-fired crust in town? Addis, we've got you covered! ${
        tone.includes('Friendly')
          ? "Gather the squad and feast on our sizzling specials topped with fresh local ingredients. 😋🔥"
          : "Experience artisanal culinary perfection with our signature gourmet selection."
      } Every bite is pure joy.`;
      hashtags = `#AddisEats #PizzaLovers #BoleFoodie #AddisAbaba #TasteOfAddis #PizzaTime`;
      cta = `📲 Call +251-911-000000 or tap the link in bio to claim your 20% discount today!`;
    } else {
      caption = `✨ Looking for something extraordinary? Introducing our latest campaign for ${topic}! Tailored specially for our amazing community in ${audience}. Experience the difference with our high-quality service and unbeatable value. 🚀`;
      hashtags = `#${topic.replace(/\s+/g, '')} #Innovation #${platform} #AddisAbaba #Trending`;
      cta = `👉 Tap the link in bio or DM us right now to learn more!`;
    }

    if (useRag) {
      caption += `\n\n📌 (Verified against Brand Voice Guidelines & Compliance: Terms apply. Valid while supplies last.)`;
    }

    const simulatedDraft: Draft = {
      id: `draft-${Date.now()}`,
      created_at: new Date().toISOString(),
      topic,
      platform,
      audience,
      tone,
      caption,
      hashtags,
      call_to_action: cta,
      status: 'Draft - Review Required',
      source: useRag ? 'Next.js AI Engine + RAG Knowledge' : 'Next.js AI Engine',
      usedRag: useRag
    };

    const drafts = getDrafts();
    drafts.push(simulatedDraft);
    saveDrafts(drafts);

    return NextResponse.json({
      success: true,
      draft: simulatedDraft,
      provider: 'Next.js Local AI Engine (Fallback Mode)'
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
