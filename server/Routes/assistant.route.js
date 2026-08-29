import express from "express"
import { askAssistant, getAssistantConfig } from "../controllers/assistant.controller.js"
const assistantRouter = express.Router()

assistantRouter.get("/config/:userId", getAssistantConfig)
assistantRouter.post("/ask",askAssistant)

export default assistantRouter