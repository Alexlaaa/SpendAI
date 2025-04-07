FROM python:3.9-slim

WORKDIR /src/receipt-service

RUN pip install flask==2.0.1
RUN pip install flask-cors==3.0.10
RUN pip install Werkzeug==2.0.1
RUN pip install google-api-python-client==2.143.0
RUN pip install google-generativeai==0.7.2
RUN pip install Pillow==10.4.0
RUN pip install python-dateutil==2.9.0
RUN pip install price-parser==0.3.4
RUN pip install openai==1.44.0
RUN pip install tiktoken==0.7.0
RUN pip install pdf2image==1.17.0

## Install poppler for pdf2image
RUN apt-get update && apt-get install wget build-essential cmake libfreetype6-dev pkg-config libfontconfig-dev libjpeg-dev libopenjp2-7-dev -y
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
    && ldconfig
CMD tail -f /dev/null

ENV PYTHONUNBUFFERED=1

COPY . .

RUN mkdir -p /src/receipt-service/downloads

EXPOSE 8081

CMD ["python", "receiptservice.py"]