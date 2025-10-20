# PadleTime

A full-stack web application for managing padel tennis court reservations. PadleTime allows users to book courts, join waitlists when slots are unavailable, and receive automatic notifications when spots open up. Administrators can manage fields, pricing, user roles, and view detailed analytics.

## Features

### User Features
- **Account Management**: Register, login, profile management, and password recovery
- **Google OAuth**: Quick sign-in with Google authentication
- **Court Reservations**: Browse available time slots and book padel courts
- **Waitlist System**: Join waitlists for fully-booked slots with automatic notifications when spaces become available
- **Reservation History**: View past and upcoming reservations
- **Notifications**: Receive automatic notifications when reservations are cancelled and spots open

### Admin Features
- **Field Management**: Create, update, and delete padel courts
- **Dynamic Pricing**: Configure prices based on time slots and date ranges
- **User Management**: Manage user roles (regular, admin, superadmin)
- **Reservation Oversight**: View and manage all reservations
- **Manual Notifications**: Send notifications to users
- **Analytics Dashboard**: View usage statistics including:
  - Most frequently booked fields
  - Popular time slots
  - Underutilized courts
  - Waitlist demand insights
  - Reservation audit trail

## Tech Stack

### Backend
- **Flask 3.0.3** - Python web framework
- **PostgreSQL** - Database with psycopg2
- **JWT (Flask-JWT-Extended)** - Authentication
- **Flask-CORS** - Cross-origin support
- **Python 3.x**

### Frontend
- **React 18.2.0** with TypeScript
- **Vite 4.4.5** - Build tool and dev server
- **Material-UI (MUI) v5** - Component library
- **React Router v6** - Client-side routing
- **React Hook Form + Yup** - Form validation
- **Axios** - HTTP client
- **React-Toastify** - Notifications
- **SCSS** - Styling

## Project Structure

```
padletime/
├── backend/
│   ├── api.py              # Main Flask application
│   ├── requirements.txt    # Python dependencies
│   ├── swagger.yml         # API documentation
│   └── querys/             # SQL schema and queries
│       ├── query1.sql      # Database schema
│       ├── query16.sql     # Waitlist notification trigger
│       └── ...
│
├── frontend/
│   ├── src/
│   │   ├── api/            # API client configuration
│   │   ├── pages/          # Page components
│   │   ├── components/     # Reusable components
│   │   ├── contexts/       # React context (auth)
│   │   ├── hooks/          # Custom hooks
│   │   ├── schemas/        # Validation schemas
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Utilities
│   ├── package.json
│   └── vite.config.ts
│
└── README.md
```

## Prerequisites

- **Python 3.x** with virtualenv
- **Node.js** (v16 or higher) and npm
- **PostgreSQL** database

## Installation & Setup

### 1. Database Setup

Create a PostgreSQL database for the application.

### 2. Backend Setup

Navigate to the backend directory and set up the Python environment:

```bash
cd backend

# Create and activate virtual environment
virtualenv env
source env/bin/activate  # On Windows: env\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

Create a `.env` file in the `backend` directory:

```env
DATABASE_URL="host=localhost dbname=your_db user=your_user password=your_pass"
JWT_SECRET_KEY="your-secret-key-here"
```

Create a `.flaskenv` file in the `backend` directory:

```env
FLASK_APP=api
FLASK_DEBUG=1
FLASK_RUN_PORT=8000
```

Initialize the database by running the SQL files in the `querys/` directory (start with `query1.sql` for schema creation).

### 3. Frontend Setup

Navigate to the frontend directory and install dependencies:

```bash
cd frontend

# Install dependencies
npm install
```

Configure the API endpoint in `frontend/src/api/api.tsx` if needed (default: `http://localhost:8000`).

## Running the Application

### Start the Backend

```bash
cd backend
source env/bin/activate  # On Windows: env\Scripts\activate
flask run
```

The API will be available at `http://localhost:8000`

### Start the Frontend

In a separate terminal:

```bash
cd frontend
npm run dev
```

The application will be available at `http://localhost:5173` (or the port shown in terminal)

## Available Scripts

### Backend
- `flask run` - Start the development server
- `flask --help` - View available Flask commands

### Frontend
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production (TypeScript compilation + Vite build)
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## API Documentation

API documentation is available in `backend/swagger.yml`. The backend provides 50+ RESTful endpoints for:
- Authentication and user management
- Field and reservation management
- Pricing configuration
- Waitlist operations
- Notifications
- Analytics and reporting

## Database Schema

Key tables:
- **client** - User accounts and roles
- **fields** - Padel courts
- **reservation** - Booking records
- **waitlist** - Waitlist entries
- **price** - Dynamic pricing rules
- **manual_notification** & **automatic_notification** - Notification system
- **Audit tables** - Change tracking for reservations, users, and waitlist

## Authentication

The application uses JWT-based authentication:
1. Users log in with email/password or Google OAuth
2. JWT tokens are stored in localStorage
3. Tokens are automatically included in API requests via Axios interceptors
4. Protected routes require valid JWT tokens

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is private and proprietary.
