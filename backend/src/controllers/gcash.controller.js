import fs from "fs";
import multer from "multer";
import QRCode from "qrcode-reader";
import { Jimp } from "jimp";
import User from "../models/User.js";

// Configure Multer — temporary local storage only
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/gcash"); // save temporarily
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + "-" + file.originalname;
        cb(null, uniqueName);
    },
});

export const upload = multer({ storage });

// 🧠 Helper: Decode QR from uploaded image
const decodeQR = async (filePath) => {
    const image = await Jimp.read(filePath);
    return new Promise((resolve, reject) => {
        const qr = new QRCode();
        qr.callback = (err, value) => {
            if (err) return reject(err);
            resolve(value?.result || null);
        };
        qr.decode(image.bitmap);
    });
};

// 📥 Upload & extract GCash QR
export const uploadGCashQR = async (req, res) => {
    try {
        const userId = req.user.id; // assuming you use auth middleware
        const filePath = req.file.path;

        // 1. Decode QR from the image
        const qrData = await decodeQR(filePath);
        if (!qrData) {
            fs.unlinkSync(filePath);
            return res.status(400).json({ message: "Invalid QR code." });
        }

        // 2. Extract accountName and accountNumber from req.body (manual)
        const { accountName, accountNumber } = req.body;
        if (!accountName || !accountNumber) {
            fs.unlinkSync(filePath);
            return res.status(400).json({ message: "Account name and number are required." });
        }

        // 3. Update user GCash data
        const user = await User.findByIdAndUpdate(
            userId,
            {
                $set: {
                    "gcash.qrData": qrData,
                    "gcash.accountName": accountName,
                    "gcash.accountNumber": accountNumber,
                    "gcash.isVerified": false, // manual or later verified
                },
            },
            { new: true }
        );

        // 4. Delete file to save storage
        fs.unlinkSync(filePath);

        res.json({
            message: "GCash QR uploaded successfully.",
            gcash: user.gcash,
        });
    } catch (error) {
        console.error("GCash upload error:", error);
        res.status(500).json({ message: "Server error uploading GCash QR." });
    }
};

// 📤 (Optional) GET user GCash info
export const getGCashInfo = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("gcash");
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json({ gcash: user.gcash });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch GCash info" });
    }
};