# Hub2.0 WIP
This was built completly by ai, This is a not complete and is a work in progress.


A modern, customizable dashboard for managing your applications, services, and bookmarks.

## Features

- 🚀 Application launcher with customizable groups
- 📊 Service status monitoring
- 🔖 Bookmark management
- ⛅ Weather updates
- 🕒 Real-time clock
- ⚙️ Easy-to-use settings panel
- 🔒 Secure authentication

## Security Notice

This application uses authentication to protect your dashboard. By default, it uses a simple password-based authentication system. For production use, please:

1. Change the default password immediately after first login
2. Use strong environment variables
3. Set up proper HTTPS
4. Consider implementing additional security measures

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- OpenWeatherMap API key (optional, for weather features)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/RamRaid470/Hub.git
   cd Hub
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```

4. Configure your environment variables in `.env`:
   ```
   PORT=3000
   NODE_ENV=development
   SESSION_SECRET=your_secure_session_secret_here
   JWT_SECRET=your_jwt_secret_here
   WEATHER_API_KEY=your_openweathermap_api_key_here
   DEFAULT_ADMIN_PASSWORD=your_secure_password_here
   ```

5. Start the server:
   ```bash
   npm start
   ```

## Configuration

### Environment Variables

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment mode (development/production)
- `SESSION_SECRET`: Secret for session encryption (required)
- `JWT_SECRET`: Secret for JWT tokens (required)
- `WEATHER_API_KEY`: OpenWeatherMap API key (optional)
- `DEFAULT_ADMIN_PASSWORD`: Initial admin password (change after first login)

### Data Storage

The application stores its data in JSON files:
- `apps.json`: Application groups and links
- `services.json`: Service monitoring configuration
- `bookmarks.json`: Bookmark data
- `users.json`: Encrypted user credentials

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with password
- `POST /api/auth/logout` - Logout current session
- `POST /api/auth/change-password` - Change admin password

### Apps
- `GET /api/apps` - Get all apps
- `POST /api/apps/save` - Save apps configuration

### Services
- `GET /api/services` - Get all services
- `POST /api/services/save` - Save services configuration
- `POST /api/ping` - Check service status

### Bookmarks
- `GET /api/bookmarks` - Get all bookmarks
- `POST /api/bookmarks/save` - Save bookmarks configuration

### Weather
- `GET /api/weather` - Get current weather data
- `POST /api/weather/settings` - Save weather settings

## Development

### Project Structure

```
Hub2.0/
├── backend/           # Backend server code
│   ├── routes/       # API route handlers
│   ├── auth.js       # Authentication logic
│   └── server.js     # Main server file
├── frontend/         # Frontend assets
│   ├── css/         # Stylesheets
│   ├── js/          # JavaScript files
│   ├── index.html   # Main dashboard
│   └── login.html   # Login page
├── data/            # Data storage (created at runtime)
├── .env             # Environment variables
└── package.json     # Project dependencies
```

### Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Security Considerations

1. Always change the default password after installation
2. Use strong, unique secrets for `SESSION_SECRET` and `JWT_SECRET`
3. Keep your `.env` file secure and never commit it to version control
4. Regularly update dependencies for security patches
5. Use HTTPS in production
6. Consider implementing rate limiting for production use

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Icons provided by [Icons8](https://icons8.com)
- Weather data from [OpenWeatherMap](https://openweathermap.org)

## Support

For support, please open an issue in the GitHub repository. 
