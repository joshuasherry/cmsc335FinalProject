const path = require("path");
const axios = require('axios');

const express = require("express");   /* Accessing express module */
const app = express();  /* app is a request handler function */
app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");

app.use(express.static(path.join(__dirname, "public")));

const bodyParser = require("body-parser"); /* To handle post parameters */

const portNumber = 4000;
app.listen(portNumber); 
console.log(`Web server is running at http://localhost:${portNumber}`);
process.stdout.write("stop to shutdown the server: ");
process.stdin.setEncoding("utf8"); /* encoding */

process.stdin.on('readable', () => {
    const dataInput = process.stdin.read(); 
    if (dataInput !== null) {
        const command = dataInput.trim();
        if (command === "stop") {
            process.exit(0);
        }
        else{
            process.stdin.resume();
        } 
    }
});

/* Our database and collection */
const name = "CMSC335_DB";
const coll = "names";
const uri = "mongodb+srv://" +"jsherry1" +":" +"passwordcmsc" +"@cluster0.drxdsfi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const databaseAndCollection = {db: name, collection:coll};

const { MongoClient, ServerApiVersion } = require('mongodb');
const client = new MongoClient(uri, {serverApi: ServerApiVersion.v1 });

async function getGenderInfo(name) {
    await client.connect();
    const result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).findOne({ name: name });
    await client.close();

    if (!result){

        try {
            const response = await axios.get('https://api.genderize.io/', {
                params: { name: name }
            });

            const { gender, probability } = response.data;

            add(name, gender, probability);

            return { gender, probability };

        } catch (error) {
            throw error;
        }
    }else{
        const { gender, probability } = result;
        return { gender, probability };
    }
}

async function add(name, gender, probability) {

    try {
        await client.connect();
       
        let person = {name: name, gender: gender, probability: probability};
        await insert(client, databaseAndCollection, person);

    } catch (e) {
        console.error();
    } finally {
        await client.close();
    }
}

async function insert(client, databaseAndCollection, person) {
    const result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(person);
}

async function displayAll(response) {
    try {
        await client.connect();
        let filter = {};
        const result = await client.db(databaseAndCollection.db)
                        .collection(databaseAndCollection.collection)
                        .find(filter)
                        .toArray();
        
        let tablecontent = `<table border="1"><thead><tr><th>Name</th><th>Gender</th><th>Confidence</th></tr></thead><tbody>`;
        result.forEach(res => {
            tablecontent += `<tr><td>${res.name}</td><td>${res.gender}</td><td>${res.probability}</td></tr>`;
        });
        
        tablecontent += "</tbody></table>";
        response.render("history", {table : tablecontent});
             
    } catch (e) {
        console.error();
    } finally {
        await client.close();
    }
}


app.get("/", (request, response) => {
    /* Generating the HTML using welcome template */
    response.render("index");
}); 

app.get("/findGender", (request, response) => {
    /* Generating the HTML using welcome template */
    response.render("findGender", {portNumber});
}); 

app.use(bodyParser.urlencoded({extended:false}));
app.post("/resultGender", (request, response) => {
    let { name } = request.body;

    // Call the getGenderInfo function
    getGenderInfo(name)
        .then(genderInfo => {
            const { gender, probability } = genderInfo;
            
            response.render("resultGender", { name, gender, probability });
        })
        .catch(error => {
            console.error('Error fetching gender information:', error);
            response.status(500).send('Error fetching gender information');
        });
});

app.get("/history", (request, response) => {
    /* Generating the HTML using welcome template */
    displayAll(response);
}); 
