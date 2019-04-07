# Whatsapp Flight Status Chatbot

This project is a Whatsapp Chatbot for checking flight status.

The Twilio Whatsapp API is used to program the chatbot, and the API provided by Aviation Edge (docs [here](https://aviation-edge.com/developers/))

## Installation and setup

*Note: If you are hosting the code on repl.it for testing, there is no need to do step 3 and 4.*

1. Get your API for free (though limited to 100 API calls) at [Aviation Edge's website](https://aviation-edge.com/subscribe/signup.php?level=1).

2. Copy the contents from the **.example.env** file into a new **.env** file, and replace the contents as needed.

3. Use the package manager [npm](https://nodejs.org/en/download/) to install dependencies.

```
npm i
```

4. Start the server using node.

```
npm start
```

## Usage

1. Send a WhatsApp message to **+1 415 523 8886** with code join **crew-afternoon**.
2. Enter the IATA code of a flight you want to check, for example **SQ305**.
3. Wait for the response.
