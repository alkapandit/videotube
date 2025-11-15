import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import userRouter from "./routes/user.route.js";
import { errorHandler } from "./middlewares/errorHandler.middleware.js";
import dotenv from "dotenv";

dotenv.config();
const app = express();

app.use(express.json());
app.use(helmet());
app.use(morgan("dev"));
app.use(
  cors({
    origin: "http://localhost:5173", 
    credentials: true, 
  })
);

app.get("/", (req, res) => {
  res.send(`Node.js v22 app is running 🚀`);
});

app.use("/api/users", userRouter);

app.use(errorHandler);

export default app;
