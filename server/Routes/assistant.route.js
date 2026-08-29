import express from "express"
import { getAssistantConfig } from "../controllers/assistant.controller"
const assistantRouter = express.Router()

assistantRouter.get('/config/:userId', getAssistantConfig)


export default assistantRouter