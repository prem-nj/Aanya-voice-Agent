import mongoose from "mongoose";

const PageSchema = new mongoose.Schema({
  name: String,
  path: String,
  keyword: {
    type: [string],
    default:[],
  },
},{_id:false})

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required:true
  },

  email:{
    type: String,
    required: true,
    unique:true
  },
  assistantName: {
    type: String,
    default:"Anaya"
  },
  businessName: {
    type: Stirng,
    default:""
  },
  buisnessType: {
    type: String,
    default:""
  },
  buisnessDescription: {
    type: String,
    default:""
  },
  tone: {
    type: String,
    enum: ["friendly", "professional", "sales"],
    default:"friendly"
  },
  theme:{
    type: String,
    enum: ["light", "dark", "glass", "neon"],
    default:"dark"
  },
  enableVoice: {
    type: Boolean,
    default:true
  },
  pages: {
    type: [PageSchema],
    default:[]
  },
  enableNaigation: {
    type: Boolean,
    default:true
  },
  
  geminApiKey: {
    type: String,
    default:""
  },
  geminiStatus: {
    type: String,
    enum: ["active", "quota_exceed", "invalid"],
    default:"active"
  },
  totalmessage: {
    type: Number,
    default:0
  },
  plan: {
    type: String,
    enum: ["free", "pro"],
    default:"free"
  },
  requestLimit: {
    type: Number,
    default:200,
  }
  ,
  proExpireAt: {
    type: Date,
    default:null
  }
  , issetupComplete: {
    type: Boolean,
    default:false
}
  
}, { timestamps: true })


const User = mongoose.models("user", userSchema);
export default User