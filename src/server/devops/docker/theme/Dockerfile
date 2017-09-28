# Set nginx base image
FROM gcr.io/google_containers/nginx-slim:0.15

# File Author / Maintainer
MAINTAINER TMake

# Copy custom configuration file from the current directory
COPY nginx.conf /etc/nginx/nginx.conf

# kubernetes provides certs via secrets
COPY build/theme/ /www/theme/