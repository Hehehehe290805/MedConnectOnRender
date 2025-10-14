import Institute_Service from "../models/Institute_Service.js";
import Pricing from "../models/Pricing.js";
import Service from "../models/Service.js";

// Set or Update Pricing
export async function setOrUpdatePricing(req, res) {
    const providerId = req.user._id; // Doctor or Institute ID
    const { serviceId, price } = req.body;

    try {
        let pricing = await Pricing.findOne({ providerId, serviceId });

        if (pricing) {
            // Update existing pricing
            pricing.price = price;
        } else {
            // Create new pricing
            pricing = new Pricing({
                providerId,
                serviceId,
                price
            });
        }

        await pricing.save();
        return res.status(200).json({
            message: "Pricing set/updated successfully",
            pricing
        });
    } catch (error) {
        console.error("Error setting/updating pricing:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

// Get pricing for specific specialty, subspecialty, and service from all providers
export async function getPricing(req, res) {
    const { providerId, serviceId } = req.query;

    try {
        const filter = {};
        if (providerId) filter.providerId = providerId;
        if (serviceId) filter.serviceId = serviceId;

        const pricingList = await Pricing.find(filter)
            .populate('providerId', 'firstName lastName profession facilityName role')
            .populate('serviceId', 'name');

        return res.status(200).json({ pricing: pricingList });
    } catch (error) {
        console.error("Error fetching pricing:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

// Get Pricing for specific institute
export async function getInstitutePrices(req, res) {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({ message: "userId is required" });
        }

        // 1️⃣ Find only verified service claims by this institute
        const claimedServices = await Institute_Service.find({
            instituteId: userId,
            status: "verified",
        }).populate("serviceId", "name");

        // 2️⃣ For each claimed service, find its pricing
        const servicesWithPricing = await Promise.all(
            claimedServices.map(async (claim) => {
                const pricing = await Pricing.findOne({
                    providerId: userId,
                    serviceId: claim.serviceId._id,
                });

                return {
                    claimId: claim._id,
                    serviceId: claim.serviceId?._id,
                    name: claim.serviceId?.name,
                    price: pricing.price
                };
            })
        );

        res.status(200).json({
            success: true,
            count: servicesWithPricing.length,
            services: servicesWithPricing,
        });

    } catch (error) {
        console.error("Error fetching institute services:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}