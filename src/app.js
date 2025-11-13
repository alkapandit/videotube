import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';
import userRouter from './routes/user.route.js';

const app = express();

app.use(express.json());
app.use(helmet());
app.use(morgan('dev'));
app.use(cors());

app.get('/', (req, res) => {
    res.send(`Node.js v22 app is running 🚀`)
})

app.use("/api/users", userRouter);

export default app;