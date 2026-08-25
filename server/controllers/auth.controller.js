import User from "../models/usermodel"

export default googleAuth = async (req, res) => {
  try {
    const { name, email } = req.body
    if (!name || !eamil) {
    return res.status(400).json({message:"Name and email are required"})
    }
    let user = await User.findOne({ email });
    if (!user) {
      user=await User.create(name,email)
    }

    
  } catch(error) {
    
  }
}