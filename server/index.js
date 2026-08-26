import express from "express"
import dotenv from "dotenv"
import connectDB from "./config/connection.js"
import authRouter from "./Routes/auth.route.js"
import cookieParser from "cookie-parser"
import cors from "cors"
import userRouter from "./Routes/user.route.js"
dotenv.config()

const app = express()
app.use(cors({
  origin: "http://localhost:5173",
    credentials:true
}))


app.use(express.json())
app.use(cookieParser())
app.use("/api/user",userRouter)

app.use("/api/auth",authRouter)

app.listen(process.env.PORT, () => {
  console.log(`server is running on ${process.env.PORT}`)
  connectDB()
})
