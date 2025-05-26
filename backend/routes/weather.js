const express = require('express');
const Security = require('../security');
const axios = require('axios');

const router = express.Router();

// OpenWeatherMap configuration
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const WEATHER_API_URL = 'https://api.openweathermap.org/data/2.5/weather';
const DEFAULT_CITY = process.env.DEFAULT_CITY || 'London';

// Get weather data
router.get('/', Security.authMiddleware, async (req, res) => {
  try {
    if (!WEATHER_API_KEY) {
      return res.status(500).json({
        status: 'error',
        message: 'Weather API key not configured'
      });
    }

    const city = req.query.city || DEFAULT_CITY;
    const response = await axios.get(WEATHER_API_URL, {
      params: {
        q: city,
        appid: WEATHER_API_KEY,
        units: 'metric'
      }
    });

    const weather = response.data;
    res.json({
      status: 'success',
      city: weather.name,
      temp: Math.round(weather.main.temp),
      desc: weather.weather[0].description,
      icon: weather.weather[0].icon,
      humidity: weather.main.humidity,
      wind: weather.wind.speed
    });
  } catch (error) {
    if (error.response?.status === 404) {
      res.status(404).json({
        status: 'error',
        message: 'City not found'
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch weather data'
      });
    }
  }
});

module.exports = router; 