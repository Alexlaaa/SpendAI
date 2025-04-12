FROM python:3.9-slim

WORKDIR /src/receipt-service

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install Python dependencies from requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Install system dependencies required by pdf2image (poppler)
# Note: Combined apt-get install commands for efficiency
RUN apt-get update && apt-get install -y --no-install-recommends \
    poppler-utils \
    wget \
    build-essential \
    cmake \
    libfreetype6-dev \
    pkg-config \
    libfontconfig-dev \
    libjpeg-dev \
    libopenjp2-7-dev \
    && rm -rf /var/lib/apt/lists/* # Clean up apt cache

# Keep existing poppler build steps (consider simplifying if possible later)
RUN wget https://poppler.freedesktop.org/poppler-data-0.4.9.tar.gz \
    && tar -xf poppler-data-0.4.9.tar.gz \
    && cd poppler-data-0.4.9 \
    && make install \
    && cd .. \
    && wget https://poppler.freedesktop.org/poppler-20.08.0.tar.xz \
    && tar -xf poppler-20.08.0.tar.xz \
    && cd poppler-20.08.0 \
    && mkdir build \
    && cd build \
    && cmake .. \
    && make \
    && make install \
    && ldconfig \
    && rm -rf /src/receipt-service/poppler-data-0.4.9.tar.gz /src/receipt-service/poppler-data-0.4.9 \
           /src/receipt-service/poppler-20.08.0.tar.xz /src/receipt-service/poppler-20.08.0 # Clean up build files

# Set environment variable after dependencies are installed
ENV PYTHONUNBUFFERED=1

# Copy the rest of the application code AFTER installing dependencies
COPY . .

# Create downloads directory (if needed by the application)
RUN mkdir -p /src/receipt-service/downloads

EXPOSE 8081

CMD ["python", "receiptservice.py"]
