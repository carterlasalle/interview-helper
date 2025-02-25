import sqlite3 from "sqlite3";
import { app } from "electron";
import path from "path";
import {
  Conversation,
  AppSettings,
  Transcript,
  AIResponse,
} from "../../common/types";

// Open a database connection
const dbPath = path.join(app.getPath("userData"), "aica-database.sqlite");
const db = new sqlite3.Database(dbPath);

// Initialize database tables
export const setupDatabase = () => {
  // Create tables if they don't exist
  db.serialize(() => {
    // Conversations table
    db.run(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        date INTEGER NOT NULL,
        metadata TEXT NOT NULL
      )
    `);

    // Transcripts table
    db.run(`
      CREATE TABLE IF NOT EXISTS transcripts (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        text TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        speaker TEXT,
        confidence REAL NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      )
    `);

    // AI Responses table
    db.run(`
      CREATE TABLE IF NOT EXISTS responses (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        source TEXT,
        confidence REAL NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      )
    `);

    // Settings table
    db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

    console.log("Database initialized at", dbPath);
  });
};

// Conversation methods
export const saveConversation = (conversation: Conversation): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run("BEGIN TRANSACTION");

      // Insert conversation
      db.run(
        "INSERT OR REPLACE INTO conversations (id, title, date, metadata) VALUES (?, ?, ?, ?)",
        [
          conversation.id,
          conversation.title,
          conversation.date,
          JSON.stringify(conversation.metadata),
        ],
        (err) => {
          if (err) {
            db.run("ROLLBACK");
            reject(err);
            return;
          }

          // Insert transcripts
          const transcriptStmt = db.prepare(
            "INSERT OR REPLACE INTO transcripts (id, conversation_id, text, timestamp, speaker, confidence) VALUES (?, ?, ?, ?, ?, ?)",
          );

          conversation.transcripts.forEach((transcript) => {
            transcriptStmt.run(
              transcript.id,
              conversation.id,
              transcript.text,
              transcript.timestamp,
              transcript.speaker || null,
              transcript.confidence,
            );
          });

          transcriptStmt.finalize();

          // Insert responses
          const responseStmt = db.prepare(
            "INSERT OR REPLACE INTO responses (id, conversation_id, question, answer, timestamp, source, confidence) VALUES (?, ?, ?, ?, ?, ?, ?)",
          );

          conversation.responses.forEach((response) => {
            responseStmt.run(
              response.id,
              conversation.id,
              response.question,
              response.answer,
              response.timestamp,
              response.source ? JSON.stringify(response.source) : null,
              response.confidence,
            );
          });

          responseStmt.finalize();

          db.run("COMMIT", (err) => {
            if (err) {
              db.run("ROLLBACK");
              reject(err);
            } else {
              resolve();
            }
          });
        },
      );
    });
  });
};

export const getConversation = (id: string): Promise<Conversation | null> => {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT * FROM conversations WHERE id = ?",
      [id],
      (err, conversationRow) => {
        if (err) {
          reject(err);
          return;
        }

        if (!conversationRow) {
          resolve(null);
          return;
        }

        // Get transcripts
        db.all(
          "SELECT * FROM transcripts WHERE conversation_id = ? ORDER BY timestamp ASC",
          [id],
          (err, transcriptRows) => {
            if (err) {
              reject(err);
              return;
            }

            // Get responses
            db.all(
              "SELECT * FROM responses WHERE conversation_id = ? ORDER BY timestamp ASC",
              [id],
              (err, responseRows) => {
                if (err) {
                  reject(err);
                  return;
                }

                const conversation: Conversation = {
                  id: (conversationRow as any).id,
                  title: (conversationRow as any).title,
                  date: (conversationRow as any).date,
                  metadata: JSON.parse((conversationRow as any).metadata),
                  transcripts: transcriptRows.map((row: any) => ({
                    id: row.id,
                    text: row.text,
                    timestamp: row.timestamp,
                    speaker: row.speaker,
                    confidence: row.confidence,
                  })),
                  responses: responseRows.map((row: any) => ({
                    id: row.id,
                    question: row.question,
                    answer: row.answer,
                    timestamp: row.timestamp,
                    source: row.source ? JSON.parse(row.source) : undefined,
                    confidence: row.confidence,
                  })),
                };

                resolve(conversation);
              },
            );
          },
        );
      },
    );
  });
};

export const getAllConversations = (): Promise<Conversation[]> => {
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT * FROM conversations ORDER BY date DESC",
      async (err, rows) => {
        if (err) {
          reject(err);
          return;
        }

        try {
          const conversations: Conversation[] = [];

          for (const row of rows) {
            const conversation = await getConversation((row as any).id);
            if (conversation) {
              conversations.push(conversation);
            }
          }

          resolve(conversations);
        } catch (error) {
          reject(error);
        }
      },
    );
  });
};

export const deleteConversation = (id: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run("DELETE FROM conversations WHERE id = ?", [id], (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

// Settings methods
export const getSetting = <T>(key: string, defaultValue: T): Promise<T> => {
  return new Promise((resolve, reject) => {
    db.get("SELECT value FROM settings WHERE key = ?", [key], (err, row) => {
      if (err) {
        reject(err);
        return;
      }

      if (!row) {
        resolve(defaultValue);
        return;
      }

      try {
        resolve(
          row && (row as any).value
            ? JSON.parse((row as any).value)
            : defaultValue,
        );
      } catch (error) {
        reject(error);
      }
    });
  });
};

export const setSetting = <T>(key: string, value: T): Promise<void> => {
  return new Promise((resolve, reject) => {
    const stringValue = JSON.stringify(value);

    db.run(
      "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
      [key, stringValue],
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      },
    );
  });
};

// Get default settings
export const getDefaultSettings = (): AppSettings => {
  return {
    audio: {
      captureSystemAudio: true,
      captureMicrophone: true,
      noiseReduction: true,
    },
    transcription: {
      model: "whisper-1",
      useLocalModel: false,
      speakerIdentification: true,
    },
    llm: {
      model: "gpt-4",
      temperature: 0.7,
    },
    ui: {
      theme: "system",
      fontSize: 14,
      position: {
        x: 0,
        y: 0,
      },
      size: {
        width: 400,
        height: 600,
      },
    },
    privacy: {
      storeConversationsLocally: true,
      anonymizeTranscripts: false,
      autoDeleteAfterDays: 30,
    },
  };
};

// Get all settings
export const getAllSettings = async (): Promise<AppSettings> => {
  const defaultSettings = getDefaultSettings();

  try {
    return await getSetting<AppSettings>("app_settings", defaultSettings);
  } catch (error) {
    console.error("Error getting settings:", error);
    return defaultSettings;
  }
};

// Close database when app quits
app.on("quit", () => {
  db.close((err) => {
    if (err) {
      console.error("Error closing database:", err);
    } else {
      console.log("Database closed");
    }
  });
});
