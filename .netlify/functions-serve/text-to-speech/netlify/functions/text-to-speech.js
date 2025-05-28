var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// netlify/functions/text-to-speech.mjs
var text_to_speech_exports = {};
__export(text_to_speech_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(text_to_speech_exports);
var import_node_fetch = __toESM(require("node-fetch"), 1);
var import_supabase_js = require("@supabase/supabase-js");
var supabase = (0, import_supabase_js.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
var handler = async function(event, context) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: ""
    };
  }
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }
  try {
    const { text } = JSON.parse(event.body);
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Unauthorized" })
      };
    }
    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Invalid user token" })
      };
    }
    const { data: profile, error: profileError } = await supabase.from("profiles").select("plan, credits").eq("id", user.id).single();
    if (profileError || !profile) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: "No profile found" })
      };
    }
    if (profile.plan !== "pro" && profile.credits <= 0) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: "No credits left or not pro." })
      };
    }
    if (profile.plan !== "pro") {
      await supabase.from("profiles").update({ credits: profile.credits - 1 }).eq("id", user.id);
    }
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      throw new Error("OpenAI API key not configured");
    }
    const voice = profile.plan === "pro" ? "alloy" : "echo";
    const response = await (0, import_node_fetch.default)("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "tts-1",
        input: text,
        voice,
        response_format: "mp3"
      })
    });
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    const audioBuffer = await response.buffer();
    const fileName = `audio/${user.id}/${Date.now()}.mp3`;
    const { data: uploadData, error: uploadError } = await supabase.storage.from("tldrit").upload(fileName, audioBuffer, {
      contentType: "audio/mp3",
      cacheControl: "3600",
      upsert: false
    });
    if (uploadError) {
      throw new Error(`Storage upload error: ${uploadError.message}`);
    }
    const { data: { publicUrl } } = supabase.storage.from("tldrit").getPublicUrl(fileName);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        audioUrl: publicUrl
      })
    };
  } catch (error) {
    console.error("Error generating audio:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Failed to generate audio",
        details: error.message
      })
    };
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=text-to-speech.js.map
