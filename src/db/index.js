import mongoose from "mongoose";

const connectDB = async () => {
  try {

    // Connect to MongoDB
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    return conn;

  } catch (error) {
    console.error("❌ MongoDB connection error:", process.env.MONGODB_URI, error.message);
    process.exit(1); // Exit app on DB connection failure
  }
};

export default connectDB;
