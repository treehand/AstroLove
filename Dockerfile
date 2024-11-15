# Use a Python base image
FROM python:3.9-slim

# Set the working directory
WORKDIR /app

# Copy the application files to the container
COPY Backend\ Logic.py /app/app.py

# Install any required Python packages
RUN pip install flask # Replace `flask` with the actual dependencies if needed

# Expose the port the app runs on
EXPOSE 5000

# Command to run the application
CMD ["python", "app.py"]

# Use a Node.js base image
FROM node:16

# Set the working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json /app/
RUN npm install

# Copy the rest of the application files
COPY . /app/

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["npm", "start"]
