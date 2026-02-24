import { GoogleGenAI, ThinkingLevel, Modality } from "@google/genai";

const getAI = () => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface AIConfig {
  model: string;
  systemInstruction?: string;
  temperature?: number;
  useSearch?: boolean;
  useThinking?: boolean;
  aspectRatio?: string;
}

export interface ProjectFile {
  name: string;
  content: string;
  language: string;
}

export const generateAIContent = async (
  prompt: string, 
  activeFile?: ProjectFile, 
  allFiles: ProjectFile[] = [], 
  config?: AIConfig
) => {
  const ai = getAI();
  const model = config?.model || "gemini-3.1-pro-preview";
  
  const systemInstruction = config?.systemInstruction || `
    You are Marathon AI, a world-class senior software engineer and architect. 
    You are working in the Marathon IDE, a high-performance coding environment.

    Your goal is to help users build complex, large-scale web applications using React, Tailwind CSS, Lucide icons, and modern web standards.
    
    Context Awareness:
    - You will be provided with the content of the active file and other relevant files in the project.
    - Use this context to ensure consistency across the codebase (e.g., matching variable names, using existing utility functions, adhering to established patterns).
    
    Code Generation Rules:
    1. Provide a clear, professional explanation of your changes.
    2. Provide the code in a single Markdown code block.
    3. Ensure the code is complete, bug-free, and follows best practices.
    4. Use modern React patterns (hooks, functional components, TypeScript).
    5. Use Tailwind CSS for all styling.
    6. If modifying existing code, provide the FULL updated file content unless specifically asked for a snippet.
    7. Prioritize accessibility (ARIA labels, semantic HTML).
    8. Optimize for performance (memoization where appropriate, efficient rendering).
    
    Tone: Professional, helpful, and technically precise.
  `;

  // Build the context string
  let contextString = "";
  
  if (allFiles.length > 1) {
    contextString += "Project Structure & Context:\n";
    allFiles.forEach(file => {
      if (activeFile && file.name === activeFile.name) return; // Skip active file, handled below
      contextString += `File: ${file.name}\n\`\`\`${file.language}\n${file.content.slice(0, 1000)}${file.content.length > 1000 ? '...' : ''}\n\`\`\`\n\n`;
    });
  }

  const contents = `
${contextString}
Active File: ${activeFile?.name || 'New File'}
Language: ${activeFile?.language || 'tsx'}

Current Content of ${activeFile?.name || 'Active File'}:
\`\`\`${activeFile?.language || 'tsx'}
${activeFile?.content || ''}
\`\`\`

User Request: ${prompt}
  `.trim();

  try {
    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction,
        temperature: config?.temperature ?? 0.7,
        tools: config?.useSearch ? [{ googleSearch: {} }] : undefined,
        thinkingConfig: config?.useThinking ? { thinkingLevel: ThinkingLevel.HIGH } : undefined,
        imageConfig: model.includes("image") ? {
          aspectRatio: config?.aspectRatio || "1:1",
          imageSize: "1K"
        } : undefined,
      },
    });

    // Handle image models
    if (model.includes("image")) {
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const base64EncodeString = part.inlineData.data;
          return { text: `![Generated Image](data:image/png;base64,${base64EncodeString})`, type: 'image' };
        }
      }
    }

    return { text: response.text || "I couldn't generate a response. Please try again.", type: 'text' };
  } catch (error) {
    console.error("Gemini API Error:", error);
    return { text: "Error: Failed to connect to the AI service.", type: 'error' };
  }
};

export const generateSpeech = async (text: string) => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say clearly: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return base64Audio;
    }
    return null;
  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
};
