import express from "express"
import { getAssistantConfig } from "../controllers/assistant.controller"
const assistantRouter = express.Router()

assistantRouter.get('/assistant/:userId', getAssistantConfig)


export default assistantRouter