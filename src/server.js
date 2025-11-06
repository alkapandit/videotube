import app from "./app.js";
import dotenv from 'dotenv';
import connectDB from "./db/index.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

connectDB()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`✅ Server running on http://localhost:${PORT}`);
        });
    })
    .catch((err) => { console.log("MONGO db connection failed !!! ", err); });

