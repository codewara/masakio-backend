# masakio-backend

A backend API for [Masakio](https://github.com/hafsahha/MASAKIO), built with Node.js, Express, and MySQL.

## Features

- RESTful API for wishlist and recipe management
- MySQL database integration
- Environment-based configuration

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- npm
- MySQL database

### Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/codewara/masakio-backend.git
   cd masakio-backend
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. Create a `.env` file in the project root with your database credentials:
   ```
   DB_HOST=your_db_host
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_NAME=your_db_name
   PORT=your_port
   ```

### Running the Server

```sh
npm start
```

The server will run on the port specified in your `.env` file (default: 3000).

### API Endpoints

- `GET /wishlist`  
  Returns wishlist items for a user (currently hardcoded to user id 1).

- `POST /`  
  Example POST endpoint (to be implemented).

## Project Structure

```
./
├── index.js        # Main server file
├── db.js           # Database connection
├── .env            # Environment variables
├── package.json
└── README.md
```
