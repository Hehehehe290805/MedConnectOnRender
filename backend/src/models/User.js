import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    birthDate: {
      type: Date,
    },
    bio: {
      type: String,
      default: "",
    },
    profilePic: {
      type: String,
      default: "",
    },
    languages: [
      {
        type: String,
        enum: ["English", "Tagalog"],
        required: true,
      },
    ],
    location: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["notOnBoarded", "onBoarded", "pending"],
      default: "notOnBoarded",
    },
    friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    pro: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ["user", "doctor", "institute", "pharmacist", "admin"],
      default: "user",
    },
    profession: {
      type: String,
    },
    licenseNumber: {
      type: String,
    },
    facilityName: {
      type: String,
    },
    adminCode: {
      type: String,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  const isPasswordCorrect = await bcrypt.compare(enteredPassword, this.password);
  return isPasswordCorrect;
};

const ENCRYPTION_KEY = process.env.LICENSE_SECRET_KEY; // 32 chars for AES-256
const IV_LENGTH = 16;

function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

function decrypt(text) {
  const [ivHex, encryptedText] = text.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encryptedText, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

// hook to encrypt before save
userSchema.pre("save", function (next) {
  if (this.isModified("licenseNumber") && this.licenseNumber) {
    this.licenseNumber = encrypt(this.licenseNumber);
  }
  next();
});

// method to decrypt when needed
userSchema.methods.getLicenseNumber = function () {
  return this.licenseNumber ? decrypt(this.licenseNumber) : null;
};

const User = mongoose.model("User", userSchema);

export default User;