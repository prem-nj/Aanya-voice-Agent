import User from "../models/usermodel.js"
import { generateGeminiResponse } from "../config/gemini.js"
import { normalizeText, resolveNavigation } from "../utils/navigation.js"


export const getAssistantConfig = async (req, res) => {
    try {
        const { userId } = req.params

        const user = await User.findById(userId).select("-geminiApiKey")
        if (!user) {
            return res.status(404).json({ message: "failed to get user" })
        }

        return res.status(200).json({ message: "Assistant Config data ", user })

    } catch (error) {
        return res.status(500).json({ message: `Assistant Config failed ${error}` })
    }
}


export const askAssistant = async (req, res) => {
    try {
        const { message, userId } = req.body

        if (!message || !userId) {
            return res.status(400).json({ message: "Message and UserId are required" })
        }

        const user = await User.findById(userId)

        if (!user) {
            return res.status(404).json({ message: "User is not found" })
        }
        if (!user.geminiApiKey) {
            return res.status(400).json({ message: "gemini apikey is not added" })
        }

        if (user.plan === "free"
            && user.totalMessages >= user.requestLimit) {
            return res.status(400).json({ message: "Free limit reached" })
        }

        if (user.plan === "pro" && new Date(user.proExpiresAt) < new Date()) {
            user.plan === "free"

            await user.save()

            return res.status(400).json({ message: "Pro plan expired" })
        }

        const cleanMessage = normalizeText(message)

        if (user.enableNavigation) {

            // Resolve the target page for any navigation intent.
            const navigation = resolveNavigation(
                cleanMessage,
                user.pages
            )

            // Navigation request detected and a page was resolved
            if (navigation) {

                // Already open
                if (
                    req.body.currentPath ===
                    navigation.path
                ) {

                    return res.json({

                        success: true,

                        response:
                            `${navigation.name} already open`

                    });
                }

                // Navigate
                return res.json({

                    success: true,

                    action: "navigate",

                    path: navigation.path,

                    response:
                        `Opening ${navigation.name}`,

                });
            }
        }



        const prompt = `

You are ${user.assistantName}.

Business Name:
${user.businessName}

Business Type:
${user.businessType}

Business Description:
${user.businessDescription}

Assistant Tone:
${user.tone}


Rules:

- Keep replies under 15 words
- Give fast direct responses
- Talk naturally
- Behave like smart voice assistant
- Avoid long explanations
- Keep responses short for quick voice playback

User Question:
${message}

`;

     const aiResponse = await generateGeminiResponse({prompt ,apikey: user.geminiApiKey , user })

    if(user.plan === "free"){
        user.totalMessages += 1

     await user.save()

    }
    return  res.json({
                success: true,
                aiResponse
            });

    } catch (error) {

        console.log(error)

        return  res.status(500).json({
                success: false,
                message:
                    "Assistant AI Error",
            });

    }
}



