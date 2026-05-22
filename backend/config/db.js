import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const connStr = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fuelledger';
    const conn = await mongoose.connect(connStr);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Database Connection Error: ${error.message}`);
    console.error('Please make sure MongoDB is running or configure MONGODB_URI in your .env file.');
    // Do not crash the application in development, but print warning
    process.exit(1);
  }
};

export default connectDB;
