const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const JOB_URL = "https://paddleocr.aistudio-app.com/api/v2/ocr/jobs";

// Configure multer for file uploads
const upload = multer({ dest: '/tmp/uploads/' });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// Proxy endpoint to start job
app.post('/api/ocr', upload.single('file'), async (req, res) => {
  try {
    const fs = require('fs');
    const FormData = require('form-data');

    const formData = new FormData();
    formData.append('model', req.body.model || 'PaddleOCR-VL-1.5');
    if (req.body.optionalPayload) {
      formData.append('optionalPayload', req.body.optionalPayload);
    }

    if (req.file) {
      formData.append('file', fs.createReadStream(req.file.path), {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
      });
    }

    const tokenHeader = req.headers['authorization'];
    if (!tokenHeader) {
      return res.status(401).json({ error: 'Missing Authorization header' });
    }

    const response = await fetch(JOB_URL, {
      method: 'POST',
      headers: {
        'Authorization': tokenHeader,
        ...formData.getHeaders(),
      },
      body: formData,
    });

    const data = await response.json();
    res.status(response.status).json(data);

    // Cleanup temporary file
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting temp file', err);
      });
    }

  } catch (error) {
    console.error('Error starting OCR job:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

// Proxy endpoint to poll job status
app.get('/api/ocr/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const tokenHeader = req.headers['authorization'];

    if (!tokenHeader) {
      return res.status(401).json({ error: 'Missing Authorization header' });
    }

    const response = await fetch(`${JOB_URL}/${jobId}`, {
      headers: {
        'Authorization': tokenHeader,
      },
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error polling OCR job:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
