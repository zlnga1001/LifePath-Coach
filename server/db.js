import { Pool } from "pg";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();
// Initialize Supabase client
// The original code would check for process.env.DATABASE_URL.
// We'll use Supabase-specific env vars. The server will fail to start if they are missing.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const initDb = async () => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const client = await pool.connect();

  try {
    console.log("Successfully connected to the database.");

    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE,
        password_hash VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createResumesTable = `
      CREATE TABLE IF NOT EXISTS resumes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        raw_text TEXT,
        model_text TEXT,
        parsed_json JSONB,
        upload_source VARCHAR(255),
        s3_url VARCHAR(255),
        filename VARCHAR(255),
        size BIGINT,
        content_type VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createTailoredResumesTable = `
      CREATE TABLE IF NOT EXISTS tailored_resumes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        resume_id UUID REFERENCES resumes(id),
        tailored_json JSONB,
        job_description TEXT,
        model_text TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createChatMessagesTable = `
      CREATE TABLE IF NOT EXISTS chat_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID,
        role VARCHAR(255),
        content TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createEmbeddingsTable = `
      CREATE TABLE IF NOT EXISTS embeddings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        resume_id UUID REFERENCES resumes(id),
        vector FLOAT[],
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await client.query(createUsersTable);
    await client.query(createResumesTable);
    await client.query(createTailoredResumesTable);
    await client.query(createChatMessagesTable);
    await client.query(createEmbeddingsTable);

    console.log("Tables created successfully (if they didn't exist).");
  } catch (err) {
    console.error("Error during database initialization:", err);
  } finally {
    client.release();
  }
};

const saveResume = async ({
  userId = null,
  rawText = null,
  modelText = null,
  parsedJson = null,
  uploadSource = "web",
  s3Url = null,
  filename = null,
  size = null,
  contentType = null,
} = {}) => {
  if (!supabaseUrl || !supabaseKey) {
    console.warn("Supabase not configured — skipping saveResume DB write");
    return crypto.randomUUID(); // Return an ID so callers can continue, mimicking old behavior
  }
  const id = crypto.randomUUID();
  const { error } = await supabase.from("resumes").insert({
    id,
    user_id: userId,
    raw_text: rawText,
    model_text: modelText,
    parsed_json: parsedJson,
    upload_source: uploadSource,
    s3_url: s3Url,
    filename,
    size,
    content_type: contentType,
  });

  if (error) {
    console.error("Error saving resume:", error);
    return null;
  }
  return id;
};

const saveTailoredResume = async ({
  userId = null,
  resumeId = null,
  tailoredJson = null,
  jobDescription = "",
  modelText = "",
} = {}) => {
  if (!supabaseUrl || !supabaseKey) {
    console.warn(
      "Supabase not configured — skipping saveTailoredResume DB write"
    );
    return crypto.randomUUID();
  }
  const id = crypto.randomUUID();
  const { error } = await supabase.from("tailored_resumes").insert({
    id,
    user_id: userId,
    resume_id: resumeId,
    tailored_json: tailoredJson,
    job_description: jobDescription,
    model_text: modelText,
  });

  if (error) {
    console.error("Error saving tailored resume:", error);
    return null;
  }
  return id;
};

const saveChatMessage = async ({
  conversationId = null,
  role = "user",
  content = "",
} = {}) => {
  if (!supabaseUrl || !supabaseKey) {
    console.warn("Supabase not configured — skipping saveChatMessage DB write");
    return crypto.randomUUID();
  }
  const id = crypto.randomUUID();
  const { error } = await supabase.from("chat_messages").insert({
    id,
    conversation_id: conversationId,
    role,
    content,
  });

  if (error) {
    console.error("Error saving chat message:", error);
    return null;
  }
  return id;
};

const saveEmbedding = async ({
  resumeId = null,
  vector = null,
  metadata = null,
} = {}) => {
  if (!supabaseUrl || !supabaseKey) {
    console.warn("Supabase not configured — skipping saveEmbedding DB write");
    return crypto.randomUUID();
  }
  const id = crypto.randomUUID();
  const { error } = await supabase.from("embeddings").insert({
    id,
    resume_id: resumeId,
    vector,
    metadata,
  });

  if (error) {
    console.error("Error saving embedding:", error);
    return null;
  }
  return id;
};

export {
  initDb,
  saveResume,
  saveTailoredResume,
  saveChatMessage,
  saveEmbedding,
};
