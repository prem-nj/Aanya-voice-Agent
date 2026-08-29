import express from "express"
import dotenv from "dotenv"
import connectDB from "./config/connection.js"
import authRouter from "./Routes/auth.route.js"
import cookieParser from "cookie-parser"
import cors from "cors"
import userRouter from "./Routes/user.route.js"
import assistantRouter from "./Routes/assistant.route.js"
import billingRouter from "./Routes/billing.route.js"
dotenv.config()

const app = express()

const privateCors =
  cors({

    origin: [
      "https://aanya-voice-agent-1.onrender.com"
    ],

    credentials: true

  });

  const publicCors =
  cors({
    origin: "*",
  });



  
app.use(express.json())
app.use(cookieParser())
app.use("/api/user", privateCors,userRouter)
app.use("/api/assistant",publicCors,assistantRouter)
app.use("/api/billing",privateCors,billingRouter)
app.use("/api/auth",privateCors,authRouter)

app.listen(process.env.PORT, () => {
  console.log(`server is running on ${process.env.PORT}`)
  connectDB()
})
