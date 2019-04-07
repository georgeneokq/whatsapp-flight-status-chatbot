const Twilio = require('twilio');
const MessagingResponse = Twilio.twiml.MessagingResponse;
const Axios = require('axios'); // To make HTTP requests
const airports = require('./assets/airports'); // Source: https://raw.githubusercontent.com/ram-nadella/airport-codes/master/airports.json

class ChatHandler {
    constructor(expressInstance, twilioClient) {
        this.app = expressInstance;
        this.client = twilioClient;
        this.prepareResponses();
    }

    prepareResponses() {
        this.app.post('/incoming', (req, res) => {
            const msg = req.body.Body.toUpperCase();
            const twiml = new MessagingResponse(); // Helper by Twilio to build messages using their markup language
            
            // Check format so as to reduce unnecessary API calls
            if(this.isExpectedFormat(msg)) {
                this.showFlightStatus(res, twiml, msg);
            } else {
                this.showFailedStatus(res, twiml, msg);
            }
        });
    }

    // Checks whether the format of the message is a flight number
    isExpectedFormat(msg) {
        // Check if its letters followed by digits
        const matches = msg.match(/([A-z]+)(\d+)/);
        if(matches) {
            return true;
        }
        return false;
    }

    showFlightStatus(res, twiml, flightNumber) {
        const [_, airlineIataCode, airlineNumber] = flightNumber.match(/([A-z]+)(\d+)/);

        // Search for flight using routes API
        let url = `http://aviation-edge.com/v2/public/routes?key=${process.env.FLIGHT_STATUS_API_KEY}&airlineIata=${airlineIataCode}&flightNumber=${airlineNumber}`;
        Axios.get(url)
            .then(response => {
                let body = response.data;
                
                if(body.error) {
                    this.showFailedStatus(res, twiml, flightNumber);
                } else {

                    // The flight record has been found, use that to find the details using airport timetable API
                    const [details] = body;
                    const countryIataCode = details.departureIata;
                    
                    url = `http://aviation-edge.com/v2/public/timetable?key=${process.env.FLIGHT_STATUS_API_KEY}&iataCode=${countryIataCode}&type=departure`;
                    Axios.get(url)
                        .then(response => {
                            const body = response.data;
                            // No results found.
                            if(body.error) {
                                this.showFailedStatus(res, twiml, flightNumber);
                            } else {

                                // To prevent crashing, wrap reading info from codeshared into a function.
                                // If this doesn't return the iataNumber, it will return null.
                                const getIataFromCodeshared = codeshared => {
                                    if(!codeshared) return null;
                                    let infoToReturn = null;
                                    infoToReturn = codeshared["flight"];
                                    if(infoToReturn) {
                                        infoToReturn = infoToReturn["iataNumber"];
                                    }
                                    return infoToReturn;
                                };

                                let counter = 0;
                                // Find from the airport timetable
                                for(let flightInfo of body) {
                                    let type = flightInfo.type; // Departure or arrival
                                    let status = flightInfo.status; // For example 'en-route'
                                    let departure = flightInfo.departure; 
                                    let arrival = flightInfo.arrival;
                                    let airline = flightInfo.airline;
                                    let flight = flightInfo.flight;
                                    let codeshared = flightInfo.codeshared;

                                    if(flight["iataNumber"] === flightNumber ||
                                        (codeshared !== undefined ? getIataFromCodeshared(codeshared) === flightNumber : false)) {

                                        // This is the flight the user is looking for. Return this information
                                        const departureAirportInfo = airports[departure["iataCode"]];
                                        const arrivalAirportInfo = airports[arrival["iataCode"]];

                                        let estimatedDeparture = departure.estimatedTime;
                                        let estimatedDepartureDate;
                                        let estimatedDepartureTime;
                                        if(estimatedDeparture) {
                                            let estimatedDepartureStringParts = estimatedDeparture.split('T');
                                            estimatedDepartureDate = estimatedDepartureStringParts[0];
                                            estimatedDepartureTime = estimatedDepartureStringParts[1].split('.')[0]; // Split further using the . to ignore millisecond timing
                                        }
                                        let [scheduledDepartureDate, scheduledDepartureTime] = departure.scheduledTime.split('T');
                                        scheduledDepartureTime = scheduledDepartureTime.split('.')[0];
                                        
                                        let estimatedArrival = arrival.estimatedTime;
                                        let estimatedArrivalDate;
                                        let estimatedArrivalTime;
                                        if(estimatedArrival) {
                                            let estimatedArrivalStringParts = estimatedArrival.split('T');
                                            estimatedArrivalDate = estimatedArrivalStringParts[0];
                                            estimatedArrivalTime = estimatedArrivalStringParts[1].split('.')[0];
                                        }
                                        let [scheduledArrivalDate, scheduledArrivalTime] = arrival.scheduledTime.split('T');
                                        scheduledArrivalTime = scheduledArrivalTime.split('.')[0];

                                        twiml.message(
                                            `*${flightNumber.toUpperCase()}*\n\nType: ${type}\n\nStatus: ${status}\n\nDeparture:\nAirport: ${departureAirportInfo.name}, ${departureAirportInfo.city}\nScheduled Time: ${scheduledDepartureDate}, ${scheduledDepartureTime}${estimatedDeparture ? `\nEstimated departure: ${estimatedDepartureDate}, ${estimatedDepartureTime}` : ''}\n\nArrival:\nAirport: ${arrivalAirportInfo.name}, ${arrivalAirportInfo.city}\nScheduled Time: ${scheduledArrivalDate}, ${scheduledArrivalTime}${estimatedArrival ? `\nEstimated Time: ${estimatedArrivalDate}, ${estimatedArrivalTime}` : ''}`
                                        );

                                        // Send message back to user
                                        res.writeHead(200, {'Content-Type': 'text/xml'});
                                        res.end(twiml.toString());
                                        
                                        return;
                                    }
                                }
                            
                                // No matching flight has been found. Return failed status
                                this.showFailedStatus(res, twiml, flightNumber);
                            }
                        });
                    }
            });
    }

    showFailedStatus(res, twiml, originalMsg) {
        twiml.message(`No results for _${originalMsg}_.`);
        // Send message back to user
        res.writeHead(200, {'Content-Type': 'text/xml'});
        res.end(twiml.toString());
    }

}

module.exports = ChatHandler;