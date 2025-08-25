// --- Part 1: Load Environment Variables FIRST ---
const dotenv = require('dotenv');
dotenv.config();

// --- Part 2: Imports ---
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// --- Part 3: Route and Service Imports ---
const planRoutes = require('./routes/planRoutes');
const chatRoutes = require('./routes/chatRoutes');
const userRoutes = require('./routes/users');
const { startScheduler } = require('./services/taskScheduler');
const errorHandler = require('./middleware/errorHandler');

// --- Part 4: App Initialization & Middleware ---
const app = express();
app.use(cors());
app.use(express.json());

// --- Part 5: API Route Registration ---
app.use('/api/plans', planRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/users', userRoutes);

app.get('/', (req, res) => {
    res.send('AI Assistant Backend is Alive and Kicking!');
});
// Add this temporary route for testing
app.get('/ping', (req, res) => {
    console.log("✅ /ping endpoint was successfully reached!");
    res.send('Pong!');
});

// --- Part 6: Central Error Handler Registration ---
// THIS MUST BE THE LAST MIDDLEWARE
app.use(errorHandler);

// --- Part 7: Database Connection & Server Start ---
const PORT = process.env.PORT || 5001; // Ensure port is 5001
const MONGO_URI = process.env.MONGO_URI;

console.log("Attempting to connect to MongoDB...");
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("✅ Success! Connected to MongoDB Atlas.");

    // --- THIS IS THE MODIFIED PART ---
    // We explicitly tell the server to listen on '0.0.0.0'
    // This allows connections from other devices on the same network.
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server is now listening on http://0.0.0.0:${PORT}`);

      // Start the scheduler after the server is successfully running.
      startScheduler();
    });
    // ---------------------------------
  })
  .catch(err => {
    console.error("❌ Connection Failed. Could not connect to MongoDB.");
    console.error(err);
    process.exit(1);
  });