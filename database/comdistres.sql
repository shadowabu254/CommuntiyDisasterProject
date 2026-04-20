CREATE DATABASE IF NOT EXISTS comdistres CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE comdistres;

-- users
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  passwordHash VARCHAR(255) NOT NULL,
  role ENUM('Admin','Coordinator','Volunteer','Citizen') DEFAULT 'Citizen',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- reports
CREATE TABLE IF NOT EXISTS reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255),
  description TEXT,
  disasterType ENUM('flood','fire','earthquake','accident','other') NOT NULL,
  latitude DOUBLE,
  longitude DOUBLE,
  locationText VARCHAR(255),
  imageUrl VARCHAR(255),
  status ENUM('reported','in_progress','resolved') DEFAULT 'reported',
  reporterId INT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (reporterId) REFERENCES users(id) ON DELETE SET NULL
);

-- messages
CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  message TEXT NOT NULL,
  reportId INT,
  senderId INT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (reportId) REFERENCES reports(id) ON DELETE CASCADE,
  FOREIGN KEY (senderId) REFERENCES users(id) ON DELETE SET NULL
);
