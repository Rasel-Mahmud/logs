const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const moment = require('moment');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const LOGS_DIR = path.join(__dirname, 'logs');

// Create logs directory if it doesn't exist
if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
}

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.text());
app.use(express.static('frontend'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// API endpoint to receive and store logs
app.post('/api/log', (req, res) => {
    try {
        console.log('Received log request:', req.body);
        const logText = req.body;
        const currentDate = moment().utc().format('YY-MM-DD');
        const logFilePath = path.join(LOGS_DIR, `${currentDate}.json`);
        console.log('Log file path:', logFilePath);
        
        let logs = [];
        if (fs.existsSync(logFilePath)) {
            console.log('Existing log file found');
            const fileContent = fs.readFileSync(logFilePath, 'utf8');
            logs = JSON.parse(fileContent);
        } else {
            console.log('Creating new log file');
        }
        
        logs.push({
            timestamp: moment().utc().format(),
            log: logText
        });
        
        console.log('Writing logs to file...');
        fs.writeFileSync(logFilePath, JSON.stringify(logs, null, 2));
        console.log('Logs written successfully');
        
        res.status(200).json({ message: 'Log stored successfully' });
    } catch (error) {
        console.error('Error storing log:', error);
        res.status(500).json({ error: 'Failed to store log', details: error.message });
    }
});

// API endpoint to get logs by date with pagination
app.get('/api/logs', (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const perPage = parseInt(req.query.perPage) || 10;
        
        const files = fs.readdirSync(LOGS_DIR)
            .filter(file => file.endsWith('.json'))
            .sort((a, b) => b.localeCompare(a));
        
        const start = (page - 1) * perPage;
        const paginatedFiles = files.slice(start, start + perPage);
        
        const logs = {};
        paginatedFiles.forEach(file => {
            const date = file.replace('.json', '');
            const fileContent = fs.readFileSync(path.join(LOGS_DIR, file), 'utf8');
            logs[date] = JSON.parse(fileContent);
        });
        
        res.json({
            logs,
            totalPages: Math.ceil(files.length / perPage),
            currentPage: page
        });
    } catch (error) {
        console.error('Error fetching logs:', error);
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})