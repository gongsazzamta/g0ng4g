export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST만 가능해요" });
  }

  const { description = "", genre = "", image } = req.body || {};

  // 사진은 "data:image/jpeg;base64,...." 형태로 받아요
  const content = [];
  if (image) {
    const m = image.match(/^data:(image\/(?:jpeg|png|gif|webp));base64,(.+)$/);
    if (m) {
      content.push({
        type: "image",
        source: { type: "base64", media_type: m[1], data: m[2] },
      });
    }
  }

  content.push({
    type: "text",
    text:
      `캐릭터 페어의 사진과 설명을 보고, 두 사람의 분위기에 어울리는 노래를 5곡 추천해 주세요.\n` +
      `장르: ${genre || "상관없음"}\n` +
      `설명: ${description || "(없음)"}\n\n` +
      `실제로 존재하는 노래만 추천하고, 반드시 아래 JSON 배열만 출력하세요. 다른 말은 쓰지 마세요.\n` +
      `[{"title":"곡 제목","artist":"가수","reason":"추천 이유 한두 문장"}]`,
  });

  try {
    const apiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5-5",
        max_tokens: 1000,
        messages: [{ role: "user", content }],
      }),
    });

    const data = await apiResponse.json();
    if (!apiResponse.ok) {
      return res.status(apiResponse.status).json({ error: data?.error?.message || "API 오류" });
    }

    const text = data.content.map((c) => c.text || "").join("");
    const clean = text.replace(/```json|```/g, "").trim();
    const songs = JSON.parse(clean);
    return res.status(200).json({ songs });
  } catch (e) {
    return res.status(500).json({ error: "서버에서 오류가 났어요" });
  }
}
