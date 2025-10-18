import express from "express";
import { 
    paymongoWebhook, createPaymentRecord
 } from "../controllers/payment.controller.js";

const router = express.Router();

// PayMongo webhook route
router.post("/paymongo-webhook", paymongoWebhook);
router.post("/create-payment-record", createPaymentRecord);

export default router;
