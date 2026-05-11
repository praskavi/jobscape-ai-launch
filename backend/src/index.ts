import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth_routes';

// 1. Initialize configuration
dotenv.config();
const app = express();
const port = process.env.PORT;

// 2. Middleware
app.use(cors());
app.use(express.json());

// 3. Routes
app.use('/api/auth', authRoutes);

// 4. Start Server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});