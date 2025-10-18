const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY;

export async function createPayMongoPayment(appointment, doctor) {
    const amount = 1000 * 100; // Amount in centavos (example 1000 PHP)
    const data = {
        data: {
            attributes: {
                amount,
                currency: "PHP",
                description: `Appointment with Dr. ${doctor.firstName} ${doctor.lastName}`,
                redirect: {
                    success: "https://yourfrontend.com/payment-success",
                    failed: "https://yourfrontend.com/payment-failed"
                },
                type: "payment_link"
            }
        }
    };

    const response = await fetch("https://api.paymongo.com/v1/payment_links", {
        method: "POST",
        headers: {
            "Authorization": `Basic ${Buffer.from(PAYMONGO_SECRET_KEY + ":").toString("base64")}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    });

    const result = await response.json();

    return result.data?.attributes?.checkout_url || "";
}
