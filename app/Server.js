const Path = require('path');
const Express = require('express');
const BodyParser = require('body-parser');
const Twilio = require('twilio');
const ChatHandler = require('./ChatHandler');
const Ejs = require('ejs');

class Server {
    constructor() {
        this.app = Express();
    }

    start() {
        this.registerMiddleware();
        this.configureViewEngine('ejs');
        this.registerRoutes();
        this.setupTwilio();
        this.app.listen(process.env.PORT, _ => {
            console.log(`Chatbot started on port ${process.env.PORT}`);
        });
    }

    configureViewEngine(engineName) {
        this.app.set('view engine', engineName);
    }

    registerMiddleware() {
        this.app.use(Express.static(Path.join(__dirname, '../public')));
        this.app.use(BodyParser.urlencoded({extended: false}));
    }

    setupTwilio() {
        const accountSid = process.env.TWILIO_SID;
        const token = process.env.TWILIO_TOKEN;
        const client = Twilio(accountSid, token);

        // Messages handled in ChatHandler class
        const chatHandler = new ChatHandler(this.app, client);
    }

    registerRoutes() {
        this.app.get('/', (req, res) => {
            res.render('pages/index');
        });
    }
}

module.exports = Server;