import express from "express"
import dotenv from "dotenv"
import connectDB from "./config/connection.js"
import authRouter from "./Routes/auth.route.js"
import cookieParser from "cookie-parser"

dotenv.config()

const app = express()
app.use(express.json())
app.use(cookieParser())

app.use("api/auth",authRouter)

app.listen(process.env.PORT, () => {
  console.log(`server is running on ${process.env.PORT}`)
  connectDB()
})
