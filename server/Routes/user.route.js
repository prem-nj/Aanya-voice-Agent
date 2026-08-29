import express from "express"
import { isAuth } from "../Middleware/isAuth.js"
import { getCurrentUSer, saveAssistant } from "../controllers/user.controller.js"

const userRouter = express.Router()

userRouter.get('/current-user', isAuth, getCurrentUSer)
userRouter.post("/save-assistant",isAuth,saveAssistant)
export default userRouter