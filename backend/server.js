
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const mysql = require('mysql');

// Load environment variables
dotenv.config();
const _dirname = path.resolve();

const app = express();

// Configure CORS to allow requests from any origin
app.use(cors({
  origin: '*',  // Be more restrictive in production
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());
app.use(express.static(path.join(_dirname, "/frontend/dist")));
app.use(express.urlencoded({ extended: true }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Something broke!'
  });
});
// Create MySQL connection pool with more detailed configuration
const pool = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'joke',
  port: process.env.DB_PORT || 3306,
  connectTimeout: 10000,
  waitForConnections: true,
  queueLimit: 0,
  debug: process.env.NODE_ENV !== 'production'
});

// Test database connection on startup
pool.getConnection((err, connection) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    if (err.code === 'ECONNREFUSED') {
      console.error('Database connection refused. Please check if:');
      console.error('1. Database server is running');
      console.error('2. Database credentials are correct');
      console.error('3. Database host is accessible from this machine');
    }
    return;
  }
  console.log('Successfully connected to database');
  connection.release();
});

// Function to fetch jokes from database with better error handling
const fetchJokesFromDB = () => {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) {
        console.error('Error getting database connection:', err);
        reject(new Error('Database connection failed'));
        return;
      }

      connection.query('SELECT * FROM jokes', (error, results) => {
        connection.release();
        
        if (error) {
          console.error('Error executing query:', error);
          reject(new Error('Failed to fetch jokes'));
          return;
        }
        resolve(results);
      });
    });
  });
};


app.get('/post', async (req, res) => {
  try {
    const jokes = await fetchJokesFromDB();
    
    if (!jokes || jokes.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'No jokes found'
      });
    }

    res.json({
      status: 'success',
      data: jokes
    });

  } catch (error) {
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
// Serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.resolve(_dirname, "frontend", "dist", "index.html"));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message || 'Please try again later'
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
