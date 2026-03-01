import { Router } from "express";
import {
    loginHandler,
    logoutHandler,
    meHandler,
    refreshHandler,
    registerHandler,
} from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth";

const authRouter = Router();

authRouter.post("/register", registerHandler);
authRouter.post("/login", loginHandler);
authRouter.post("/refresh", refreshHandler);
authRouter.post("/logout", logoutHandler);
authRouter.get("/me", requireAuth, meHandler);

export { authRouter };
