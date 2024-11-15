import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

export default function App() {
  const [dt, setDt] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Create axios instance with configuration
  const axiosInstance = axios.create({
    baseURL: process.env.NODE_ENV === 'production' 
      ? 'https://funny-Aman.onrender.com'
      : 'http://localhost:4000',
    timeout: 15000,
    headers: {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }
  });

  useEffect(() => {
    // Flag to track component mount status
    let isMounted = true;
    const controller = new AbortController();

    const fetchData = async () => {
      try {
        const response = await axiosInstance.get('/post', {
          signal: controller.signal
        });

        // Only update state if component is still mounted
        if (isMounted) {
          if (response.data && response.data.length > 0) {
            setDt(response.data);
            localStorage.setItem('cachedJokes', JSON.stringify(response.data));
            setError(null);
          } else {
            throw new Error('No data received');
          }
        }
      } catch (err) {
        // Don't update state if request was aborted
        if (err.name === 'AbortError') {
          console.log('Request aborted');
          return;
        }

        // Only update error state if component is still mounted
        if (isMounted) {
          console.error('Error fetching data:', err);
          const cachedData = localStorage.getItem('cachedJokes');
          
          if (cachedData) {
            setDt(JSON.parse(cachedData));
            setError('Unable to fetch new data. Showing cached data.');
          } else {
            setError('Unable to connect to server. Please try again later.');
          }
        }
      } finally {
        // Only update loading state if component is still mounted
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    const handleOnline = () => {
      if (isMounted) {
        setIsOnline(true);
        setError(null);
        fetchData();
      }
    };

    const handleOffline = () => {
      if (isMounted) {
        setIsOnline(false);
        setError('You are currently offline. Showing cached data.');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial fetch if online
    if (navigator.onLine) {
      fetchData();
    }

    // Cleanup function
    return () => {
      isMounted = false;
      controller.abort(); // Abort any pending requests
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []); // Empty dependency array for initial mount only

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get('/post');
      if (response.data && response.data.length > 0) {
        setDt(response.data);
        localStorage.setItem('cachedJokes', JSON.stringify(response.data));
        setError(null);
      }
    } catch (err) {
      console.error('Error refreshing data:', err);
      setError('Failed to refresh data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNextJoke = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % dt.length);
  };

  return (
    <div className="p-4">
      {error && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
          {error}
          <button 
            onClick={handleRefresh}
            className="ml-4 text-blue-500 hover:text-blue-700"
            disabled={loading}
          >
            Try Again
          </button>
        </div>
      )}

      {!isOnline && (
        <div className="bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-4 mb-4">
          You are currently offline
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-4">
          <p>Loading...</p>
        </div>
      ) : dt.length > 0 ? (
        <div className="container">
          <h2 className="text-xl font-bold">{dt[currentIndex].title}</h2>
          <p className="mt-2">{dt[currentIndex].body}</p>
          <button 
            onClick={handleNextJoke} 
            className="btn mt-4" 
            id="jokeBtn"
          >
            Next joke 😂😂
          </button>
        </div>
      ) : (
        <div className="text-center p-4">
          <p>No data available</p>
          <button 
            onClick={handleRefresh}
            className="btn mt-4"
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      )}
    </div>
  );
}