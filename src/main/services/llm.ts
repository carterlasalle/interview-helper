import { BrowserWindow, ipcMain } from "electron";
import { getSetting, setSetting } from "./database";
import { AIResponse, AIResponseStatus } from "../../common/types";
import { v4 as uuidv4 } from "uuid";
import { getCurrentConversationContext } from "./transcription";
import { OpenAI } from "openai";

// Variables for the LLM service
let llmWindow: BrowserWindow | null = null;
let llmStatus = AIResponseStatus.IDLE;

// Set up LLM related IPC handlers
export const setupLLMService = (mainWindow: BrowserWindow) => {
  llmWindow = mainWindow;

  // Handle getting AI response for a question
  ipcMain.handle("get-ai-response", async (event, query: string) => {
    try {
      // Update status
      llmStatus = AIResponseStatus.GENERATING;

      if (llmWindow && !llmWindow.isDestroyed()) {
        llmWindow.webContents.send("llm-status", llmStatus);
      }

      // Get the conversation context
      const context = getCurrentConversationContext();

      // Generate response
      const response = await generateAIResponse(query, context);

      // Create AIResponse object
      const aiResponse: AIResponse = {
        id: uuidv4(),
        question: query,
        answer: response,
        timestamp: Date.now(),
        confidence: 0.85,
      };

      // Update status
      llmStatus = AIResponseStatus.COMPLETE;

      if (llmWindow && !llmWindow.isDestroyed()) {
        llmWindow.webContents.send("llm-status", llmStatus);
        llmWindow.webContents.send("llm-response", aiResponse);
      }

      return aiResponse;
    } catch (error) {
      console.error("Error generating AI response:", error);

      // Update status
      llmStatus = AIResponseStatus.ERROR;

      if (llmWindow && !llmWindow.isDestroyed()) {
        llmWindow.webContents.send("llm-status", llmStatus);
        llmWindow.webContents.send("llm-error", {
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }

      return {
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  });

  // Listen for transcription events to detect questions
  ipcMain.on("transcription-update", async (event, transcript) => {
    // In a real implementation, we would analyze the transcript for questions
    // and automatically generate responses when appropriate

    // For development, we'll detect some keywords
    const text = transcript.text.toLowerCase();

    if (
      text.includes("?") ||
      text.includes("what") ||
      text.includes("where") ||
      text.includes("how") ||
      text.includes("when") ||
      text.includes("why") ||
      text.includes("who")
    ) {
      // This appears to be a question - generate a response
      const response = await generateAIResponse(
        transcript.text,
        getCurrentConversationContext(),
      );

      // Create AIResponse object
      const aiResponse: AIResponse = {
        id: uuidv4(),
        question: transcript.text,
        answer: response,
        timestamp: Date.now(),
        confidence: 0.85,
      };

      // Send to renderer
      if (llmWindow && !llmWindow.isDestroyed()) {
        llmWindow.webContents.send("llm-response", aiResponse);
      }
    }
  });
};

// Generate AI response using OpenRouter or other LLM APIs
const generateAIResponse = async (
  query: string,
  context: string[],
): Promise<string> => {
  try {
    // Get LLM settings
    const llmSettings = await getSetting("llm", {
      model: "gpt-4",
      temperature: 0.7,
      apiKey: undefined,
    });

    // In a real implementation, we'd use OpenRouter to access various LLMs
    // For this development version, we'll simulate responses based on our query

    // If it's a question about Boston, return specific information
    if (query.toLowerCase().includes("boston")) {
      if (
        query.toLowerCase().includes("burger") ||
        query.toLowerCase().includes("food")
      ) {
        return (
          "Boston has some great burger spots! Some local favorites include:\n\n" +
          "1. Tasty Burger - a local chain with great affordable burgers\n" +
          "2. Wahlburgers - founded by the Wahlberg family\n" +
          "3. Boston Burger Company - known for their creative specialty burgers\n" +
          "4. JM Curley - a downtown spot with excellent burgers\n" +
          "5. R.F. O'Sullivan & Son - famous for their thick, juicy burgers\n\n" +
          "Most of these places also serve local craft beers that pair well with their food!"
        );
      }

      if (
        query.toLowerCase().includes("seafood") ||
        query.toLowerCase().includes("fish")
      ) {
        return (
          "Boston is famous for its seafood! Here are some top recommendations:\n\n" +
          "1. Legal Sea Foods - a Boston institution with multiple locations\n" +
          "2. Neptune Oyster - renowned for their lobster rolls and raw bar\n" +
          "3. Union Oyster House - America's oldest continuously operating restaurant\n" +
          "4. Row 34 - excellent for oysters and craft beer\n" +
          "5. James Hook & Co. - a no-frills spot for fresh lobster\n\n" +
          "Don't miss trying New England clam chowder and fresh lobster while you're there!"
        );
      }

      if (
        query.toLowerCase().includes("neighborhood") ||
        query.toLowerCase().includes("area")
      ) {
        return (
          "Boston has several distinct neighborhoods worth exploring:\n\n" +
          "1. Beacon Hill - historic neighborhood with beautiful gas-lit streets and brick sidewalks\n" +
          "2. North End - Boston's Little Italy with amazing restaurants and historic sites\n" +
          "3. Back Bay - upscale area with shopping on Newbury Street and Victorian brownstones\n" +
          "4. Fenway - home to Fenway Park and many universities\n" +
          "5. Cambridge - technically a separate city, but home to Harvard and MIT\n" +
          "6. Seaport District - modern waterfront area with new restaurants and museums\n\n" +
          "Each area has its own unique character and attractions!"
        );
      }

      if (
        query.toLowerCase().includes("weather") ||
        query.toLowerCase().includes("temperature")
      ) {
        return (
          "Boston weather varies dramatically by season:\n\n" +
          "- Spring (March-May): 40-65°F, often rainy but beautiful as flowers bloom\n" +
          "- Summer (June-August): 70-85°F, generally pleasant with occasional humidity\n" +
          "- Fall (September-November): 45-70°F, crisp air and spectacular foliage colors\n" +
          "- Winter (December-February): 20-40°F, cold with snow, especially in January and February\n\n" +
          "Fall is often considered the most beautiful season to visit, with comfortable temperatures and stunning colors."
        );
      }

      if (
        query.toLowerCase().includes("transportation") ||
        query.toLowerCase().includes("getting around")
      ) {
        return (
          "Getting around Boston:\n\n" +
          "1. The T (Subway) - Boston's subway system has several lines covering most tourist areas\n" +
          "2. Buses - Fill in gaps where the subway doesn't reach\n" +
          "3. Walking - Boston is very walkable, especially along the Freedom Trail\n" +
          "4. Rideshare - Uber and Lyft are widely available\n" +
          "5. Bluebikes - Boston's bike-sharing program\n\n" +
          "I wouldn't recommend renting a car unless you plan to leave the city, as parking is expensive and streets can be confusing."
        );
      }

      // General Boston info for other queries
      return "Boston is one of America's oldest and most historic cities, founded in 1630. It's known for its role in the American Revolution, prestigious universities like Harvard and MIT, sports teams like the Red Sox and Celtics, and its distinctive New England culture. Popular attractions include the Freedom Trail, Fenway Park, Quincy Market, and the Boston Common. It's a walkable city with great public transportation, excellent seafood, and beautiful architecture spanning nearly 400 years of American history.";
    }

    // For other types of questions, return a generic response
    return "I'd need to search for more information about that topic to give you a complete answer. In a future version, I'll be able to search the web for real-time information, but that capability isn't implemented yet.";

    /* In a real implementation with OpenRouter, we would:
    
    // Format the prompt with context
    const prompt = `The following is a conversation transcript. Please provide helpful information related to the most recent question or topic.
    
    CONVERSATION HISTORY:
    ${context.join("\n")}
    
    QUESTION: ${query}
    
    ANSWER:`;
    
    // Initialize OpenAI client (or OpenRouter client in production)
    const openai = new OpenAI({
      apiKey: llmSettings.apiKey,
      baseURL: "https://openrouter.ai/api/v1", // For OpenRouter
    });
    
    const response = await openai.chat.completions.create({
      model: llmSettings.model,
      messages: [
        { role: "system", content: "You are a helpful assistant providing information during a live conversation." },
        { role: "user", content: prompt }
      ],
      temperature: llmSettings.temperature
    });
    
    return response.choices[0].message.content || "I couldn't generate a response at this time.";
    */
  } catch (error) {
    console.error("Error in LLM response generation:", error);
    return "Sorry, I encountered an error generating a response. Please try again.";
  }
};
