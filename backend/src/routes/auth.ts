import { Router } from "express";
import {
    loginHandler,
    logoutHandler,
    meHandler,
    refreshHandler,
    registerHandler,
} from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth";
import { updateProfileHandler } from "../controllers/auth.controller";
import { authMutationLimiter, authenticatedMutationLimiter } from "../middleware/rate-limit";

const authRouter = Router();

authRouter.post("/register", authMutationLimiter, registerHandler);
authRouter.post("/login", authMutationLimiter, loginHandler);
authRouter.post("/refresh", authMutationLimiter, refreshHandler);
authRouter.post("/logout", authMutationLimiter, logoutHandler);
authRouter.get("/me", requireAuth, meHandler);
authRouter.patch("/me", requireAuth, authenticatedMutationLimiter, updateProfileHandler);

export { authRouter };
