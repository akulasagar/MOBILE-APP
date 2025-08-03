# AI Assistant Backend

This is the backend server for the AI Assistant mobile application.

## Features

- User authentication and management
- Plan creation and management
- Chat functionality with AI
- Push notifications
- Task scheduling

## Tech Stack

- Node.js
- Express.js
- MongoDB (MongoDB Atlas)
- JWT Authentication
- Firebase Admin SDK

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
PORT=5000
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_secret_key
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
```

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. The server will start on `http://localhost:5000`

## API Endpoints

- `GET /` - Health check
- `POST /api/users/register` - User registration
- `POST /api/users/login` - User login
- `GET /api/plans` - Get all plans
- `POST /api/plans` - Create a new plan
- `POST /api/chat/message` - Send chat message

## Deployment

### Render (Recommended)

1. Push your code to GitHub
2. Go to [Render](https://render.com) and create an account
3. Click "New +" and select "Web Service"
4. Connect your GitHub repository
5. Configure the service:
   - **Name**: `ai-assistant-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
6. Add your environment variables in the Render dashboard
7. Deploy!

### Heroku

1. Install Heroku CLI
2. Create a new Heroku app:
   ```bash
   heroku create your-app-name
   ```
3. Add environment variables:
   ```bash
   heroku config:set MONGO_URI=your_mongodb_uri
   heroku config:set JWT_SECRET=your_jwt_secret
   ```
4. Deploy:
   ```bash
   git push heroku main
   ```

### Railway

1. Go to [Railway](https://railway.app)
2. Connect your GitHub repository
3. Add environment variables
4. Deploy automatically

## Production Considerations

- Use environment variables for all sensitive data
- Set up proper CORS configuration for your domain
- Use HTTPS in production
- Set up monitoring and logging
- Configure proper error handling
- Use a production MongoDB cluster

## Support

For issues and questions, please check the documentation or create an issue in the repository. 