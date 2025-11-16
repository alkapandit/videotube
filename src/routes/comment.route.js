import { Router } from "express";

import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  addComment,
  getComments,
  likeComment,
} from "../controllers/comment.controller.js";

const router = Router();

// Protected routes
router.route("/:videoId").get(verifyJWT, getComments);
router.route("/:videoId").post(verifyJWT, addComment);
router.route("/like/:videoId").post(verifyJWT, likeComment);

export default router;
