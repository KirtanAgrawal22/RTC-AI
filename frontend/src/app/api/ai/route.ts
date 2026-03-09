import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const { prompt, code } = await req.json();

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash"
    });

    const fullPrompt = `
You are a coding assistant.

User question:
${prompt}

Current editor code:
${code}
`;

    const result = await model.generateContent(fullPrompt);
    const text = result.response.text();

    return NextResponse.json({ text });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "AI failed" }, { status: 500 });
  }
}