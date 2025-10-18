import dotenv from "dotenv";
dotenv.config();

import chai from "chai";
import chaiHttp from "chai-http";
import mongoose from "mongoose";
import { app } from "../src/app.js"; // make sure this exports your Express app
import User from "../src/models/User.js";

const { expect } = chai;
chai.use(chaiHttp);

describe("Auth Controller Integration Tests", () => {
    before(async () => {
        // ✅ connect to test DB
        await mongoose.connect(process.env.MONGO_URI);
    });

    after(async () => {
        // 🧹 clean up DB after tests
        await User.deleteMany({});
        await mongoose.connection.close();
    });

    describe("POST /api/auth/signup", () => {
        it("should successfully sign up a user", async () => {
            const res = await chai
                .request(app)
                .post("/api/auth/signup")
                .send({
                    email: "john@example.com",
                    password: "123456",
                    firstName: "John",
                    lastName: "Doe",
                });

            expect(res).to.have.status(201);
            expect(res.body).to.have.property("success", true);
            expect(res.body.user).to.have.property("email", "john@example.com");
        });

        it("should return 400 when fields are missing", async () => {
            const res = await chai.request(app).post("/api/auth/signup").send({
                email: "",
                password: "123456",
            });

            expect(res).to.have.status(400);
            expect(res.body).to.have.property("message");
        });
    });

    describe("POST /api/auth/login", () => {
        it("should successfully login an existing user", async () => {
            const res = await chai
                .request(app)
                .post("/api/auth/login")
                .send({
                    email: "john@example.com",
                    password: "123456",
                });

            expect(res).to.have.status(200);
            expect(res.body).to.have.property("success", true);
            expect(res.body.user).to.have.property("email", "john@example.com");
        });

        it("should return 401 with wrong password", async () => {
            const res = await chai
                .request(app)
                .post("/api/auth/login")
                .send({
                    email: "john@example.com",
                    password: "wrongpass",
                });

            expect(res).to.have.status(401);
            expect(res.body).to.have.property("message");
        });
    });

    describe("POST /api/auth/logout", () => {
        it("should logout and clear cookie", async () => {
            const res = await chai.request(app).post("/api/auth/logout");
            expect(res).to.have.status(200);
            expect(res.body).to.have.property("success", true);
        });
    });
});
