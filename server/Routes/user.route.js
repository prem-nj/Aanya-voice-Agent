import express from "express"
import { isAuth } from "../Middleware/isAuth.js"
import { getCurrentUSer } from "../controllers/user.controller.js"

const userRouter = express.Router()

userRouter.get('/current-user', isAuth, getCurrentUSer)
export default userRouter